import { prisma } from "../../db/prisma.js";
import { uploadImage } from "../../utlils/cloudinary.js";
import { signToken } from "../../utlils/jwt.js";
export async function professorLoginService(data) {
    const { email, password } = data;
    const professor = await prisma.user.findUnique({
        where: { email },
        include: {
            roles: { include: { role: true } }
        }
    });
    if (!professor)
        throw new Error("Invalid credentials");
    const isTeacher = professor.roles.some(r => r.role.name === "TEACHER");
    if (!isTeacher)
        throw new Error("User is not a professor");
    if (professor.hashPassword !== password)
        throw new Error("Invalid credentials");
    const sessions = await prisma.classSession.findMany({
        where: { teacherId: professor.id },
        include: {
            subject: {
                include: { enrollments: true }
            }
        },
        orderBy: { startTime: "asc" }
    });
    const now = new Date();
    const todayStr = now.toDateString();
    let activeSessionId = null;
    const classes = sessions.map(session => {
        const isToday = session.sessionDate.toDateString() === todayStr;
        const isOngoing = isToday &&
            now >= session.startTime &&
            now <= session.endTime;
        if (isOngoing && activeSessionId === null) {
            activeSessionId = session.id;
        }
        let status;
        if (isOngoing) {
            status = "ONGOING";
        }
        else if (session.startTime > now) {
            status = "UPCOMING";
        }
        else {
            status = "COMPLETED";
        }
        return {
            sessionId: session.id,
            subjectId: session.subjectId,
            code: session.subject.subjectCode,
            name: session.subject.name,
            startTime: session.startTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }),
            endTime: session.endTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }),
            location: session.room ?? "TBA",
            students: session.subject.enrollments.length,
            status
        };
    });
    const token = signToken({
        id: professor.id,
        role: "TEACHER"
    });
    return {
        token,
        professor: {
            id: professor.id,
            name: professor.name,
            email: professor.email,
            role: "TEACHER"
        },
        activeSessionId, // 🔥 frontend uses this directly
        classes
    };
}
const MODEL_URL = "http://192.168.9.18:8001/api/v1/attendance";
import fs from "fs";
import { markAttendance } from "../../lib/axios.js";
import { getVectorByPointId } from "../../lib/qdrantService.js";
/* ---------------------------------- */
/* MARK ATTENDANCE SERVICE             */
/* ---------------------------------- */
export async function markAttendanceService({ sessionId, files, }) {
    console.log("🟢 Mark Attendance Started");
    console.log("📌 Session ID:", sessionId);
    /* ---------------------------------- */
    /* 1️⃣ Upload classroom images        */
    /* ---------------------------------- */
    const image_urls = [];
    try {
        for (const file of files) {
            const url = await uploadImage(file.path);
            image_urls.push(url);
        }
    }
    finally {
        for (const file of files) {
            if (fs.existsSync(file.path))
                fs.unlinkSync(file.path);
        }
    }
    if (image_urls.length === 0) {
        throw new Error("No classroom images uploaded");
    }
    /* ---------------------------------- */
    /* 2️⃣ Fetch session + enrollments    */
    /* ---------------------------------- */
    const session = await prisma.classSession.findUnique({
        where: { id: sessionId },
        include: {
            subject: {
                include: {
                    enrollments: {
                        include: {
                            student: {
                                include: { faceEmbedding: true },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!session) {
        throw new Error("Session not found");
    }
    console.log("📘 Subject:", session.subject.name);
    console.log("👨‍🎓 Total enrolled:", session.subject.enrollments.length);
    /* ---------------------------------- */
    /* 3️⃣ DAY RANGE (IST SAFE)            */
    /* ---------------------------------- */
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const base = new Date(session.sessionDate.getTime() + IST_OFFSET_MS);
    const startOfDay = new Date(base);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    // Convert back to UTC
    startOfDay.setTime(startOfDay.getTime() - IST_OFFSET_MS);
    endOfDay.setTime(endOfDay.getTime() - IST_OFFSET_MS);
    /* ---------------------------------- */
    /* 4️⃣ SUBJECT-DAY GUARD (🔥 KEY FIX) */
    /* ---------------------------------- */
    const alreadyMarkedForSubjectToday = await prisma.attendance.findFirst({
        where: {
            session: {
                subjectId: session.subjectId,
                sessionDate: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        },
    });
    if (alreadyMarkedForSubjectToday) {
        throw new Error("Attendance already marked for this subject today");
    }
    /* ---------------------------------- */
    /* 5️⃣ Build ML students payload      */
    /* ---------------------------------- */
    const studentsForML = [];
    for (const e of session.subject.enrollments) {
        const student = e.student;
        const embedding = student.faceEmbedding;
        if (!embedding?.qdrantPointId)
            continue;
        const vector = await getVectorByPointId(embedding.qdrantPointId);
        studentsForML.push({
            student_id: String(student.id),
            name: student.name,
            roll_number: student.rollNumber,
            embedding: vector,
        });
    }
    if (studentsForML.length === 0) {
        throw new Error("No enrolled students have embeddings");
    }
    /* ---------------------------------- */
    /* 6️⃣ Call ML server                 */
    /* ---------------------------------- */
    const payload = {
        image_urls,
        students: studentsForML,
        similarity_threshold: 0.6,
    };
    const response = (await markAttendance.post("", payload));
    const presentStudents = response.data.present_students;
    /* ---------------------------------- */
    /* 7️⃣ Compute ABSENT students        */
    /* ---------------------------------- */
    const presentIds = new Set(presentStudents.map(s => Number(s.student_id)));
    const allEnrolledIds = session.subject.enrollments.map(e => e.studentId);
    const absentIds = allEnrolledIds.filter(id => !presentIds.has(id));
    /* ---------------------------------- */
    /* 8️⃣ Save attendance (TRANSACTION)  */
    /* ---------------------------------- */
    await prisma.$transaction(async (tx) => {
        for (const s of presentStudents) {
            await tx.attendance.create({
                data: {
                    sessionId,
                    studentId: Number(s.student_id),
                    status: "PRESENT",
                    confidenceScore: s.confidence,
                },
            });
        }
        for (const studentId of absentIds) {
            await tx.attendance.create({
                data: {
                    sessionId,
                    studentId,
                    status: "ABSENT",
                },
            });
        }
    });
    /* ---------------------------------- */
    /* 9️⃣ Response                       */
    /* ---------------------------------- */
    return {
        message: "Attendance marked successfully",
        subject: session.subject.name,
        date: session.sessionDate,
        presentCount: presentStudents.length,
        absentCount: absentIds.length,
    };
}
