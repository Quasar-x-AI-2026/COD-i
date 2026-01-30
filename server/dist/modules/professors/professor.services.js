import { prisma } from "../../db/prisma.js";
import { uploadImage } from "../../utlils/cloudinary.js";
import { signToken } from "../../utlils/jwt.js";
export async function professorLoginService(data) {
    const { email, password } = data;
    const professor = await prisma.user.findUnique({
        where: { email },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    });
    if (!professor) {
        throw new Error("Invalid credentials");
    }
    const isTeacher = professor.roles.some(r => r.role.name === "TEACHER");
    if (!isTeacher) {
        throw new Error("User is not a professor");
    }
    if (professor.hashPassword !== password) {
        throw new Error("Invalid credentials");
    }
    const sessions = await prisma.classSession.findMany({
        where: {
            teacherId: professor.id
        },
        include: {
            subject: {
                include: {
                    enrollments: true
                }
            }
        },
        orderBy: {
            startTime: "asc"
        }
    });
    const classes = sessions.map(session => ({
        id: String(session.id),
        code: session.subject.subjectCode,
        name: session.subject.name,
        time: session.startTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }),
        location: session.room ?? "TBA",
        students: session.subject.enrollments.length,
        status: session.sessionDate > new Date()
            ? "Upcoming"
            : "Completed"
    }));
    const token = signToken({ id: professor.id, role: "TEACHER" });
    const role = professor.roles[0]?.role.name ?? "TEACHER";
    return {
        token,
        professor: {
            id: professor.id,
            name: professor.name,
            email: professor.email,
            role
        },
        classes
    };
}
const MODEL_URL = "http://192.168.9.18:8001/api/v1/attendance";
import fs from "fs";
import { markAttendance } from "../../lib/axios.js";
import { getVectorByPointId } from "../../lib/qdrantService.js";
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
        for (const file of files)
            fs.unlinkSync(file.path);
    }
    /* ---------------------------------- */
    /* 2️⃣ Load session + enrolled users  */
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
    if (!session)
        throw new Error("Session not found");
    /* ---------------------------------- */
    /* 3️⃣ Build students payload         */
    /* ---------------------------------- */
    const students = [];
    for (const e of session.subject.enrollments) {
        const student = e.student;
        const embedding = student.faceEmbedding;
        if (!embedding?.qdrantPointId)
            continue;
        const vector = await getVectorByPointId(embedding.qdrantPointId);
        students.push({
            student_id: String(student.id),
            name: student.name,
            roll_number: student.rollNumber,
            embedding: vector,
        });
    }
    if (students.length === 0)
        throw new Error("No students have embeddings");
    /* ---------------------------------- */
    /* 4️⃣ Send payload to ML server      */
    /* ---------------------------------- */
    const payload = {
        image_urls,
        students,
        similarity_threshold: 0.6,
    };
    const response = await markAttendance.post("", payload);
    const { present_students, absent_students, } = response.data;
    /* ---------------------------------- */
    /* 5️⃣ SAVE ATTENDANCE (TRANSACTION)  */
    /* ---------------------------------- */
    await prisma.$transaction(async (tx) => {
        for (const s of present_students) {
            await tx.attendance.upsert({
                where: {
                    sessionId_studentId: {
                        sessionId,
                        studentId: Number(s.student_id),
                    },
                },
                update: {
                    status: "PRESENT",
                    confidenceScore: s.confidence,
                },
                create: {
                    sessionId,
                    studentId: Number(s.student_id),
                    status: "PRESENT",
                    confidenceScore: s.confidence,
                },
            });
        }
        for (const s of absent_students) {
            await tx.attendance.upsert({
                where: {
                    sessionId_studentId: {
                        sessionId,
                        studentId: Number(s.student_id),
                    },
                },
                update: { status: "ABSENT" },
                create: {
                    sessionId,
                    studentId: Number(s.student_id),
                    status: "ABSENT",
                },
            });
        }
    });
    return {
        message: "Attendance marked successfully",
        stats: response.data,
    };
}
