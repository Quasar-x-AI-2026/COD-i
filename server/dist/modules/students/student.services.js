import { prisma } from "../../db/prisma.js";
import { embeddingClient } from "../../lib/axios.js";
import { saveToQdrant } from "../../lib/qdrantService.js";
import { uploadImage } from "../../utlils/cloudinary.js";
import { passwordHash, verifyPassword } from "../../utlils/hash.js";
import { signToken } from "../../utlils/jwt.js";
import fs from "fs";
//register logic for student
// export async function registerStudent(data: {
//   name: string;
//   email: string;
//   password: string;
//   rollNumber: string;
//   branch: string;
//   semester: string;
//   files: any;
// }) {
//   if (
//     !data.files?.frontFace?.[0] ||
//     !data.files?.leftFace?.[0] ||
//     !data.files?.rightFace?.[0]
//   ) {
//     throw new Error("Front, left and right images are required");
//   }
//   const exists = await prisma.user.findUnique({
//     where: { email: data.email }
//   });
//   if (exists) {
//     throw new Error("Email already registered");
//   }
//   const hash = await passwordHash(data.password);
//   const frontPath = data.files.frontFace[0].path;
//   const leftPath = data.files.leftFace[0].path;
//   const rightPath = data.files.rightFace[0].path;
//   let frontUrl!: string;
//   let leftUrl!: string;
//   let rightUrl!: string;
//   try {
//     frontUrl = await uploadImage(frontPath);
//     leftUrl = await uploadImage(leftPath);
//     rightUrl = await uploadImage(rightPath);
//   } finally {
//     fs.unlinkSync(frontPath);
//     fs.unlinkSync(leftPath);
//     fs.unlinkSync(rightPath);
//   }
//   const user = await prisma.user.create({
//     data: {
//       name: data.name,
//       email: data.email,
//       hashPassword: hash,
//       rollNumber: data.rollNumber,
//       branch: data.branch,
//       semester: Number(data.semester),
//       roles: {
//         create: {
//           role: {
//             connectOrCreate: {
//               where: { name: "student" },
//               create: { name: "student" }
//             }
//           }
//         }
//       }
//     }
//   });
//   const subjects = await prisma.subject.findMany({
//     where: {
//       branch: data.branch,
//       semester: Number(data.semester)
//     }
//   });
//   if (subjects.length > 0) {
//     await prisma.enrollment.createMany({
//       data: subjects.map(s => ({
//         studentId: user.id,
//         subjectId: s.id
//       }))
//     });
//   }
//   console.log("hitting server")
//   const embeddingResponse = await embeddingClient.post<EmbeddingResponse>(
//     "/",
//     {
//       image_urls: [frontUrl, leftUrl, rightUrl],
//       student_id: String(user.id),
//       name: data.name,
//       roll_number: data.rollNumber,
//       email: data.email
//     }
//   );
//   console.log("hitted")
//   const {
//     embedding,
//     model_version,
//     average_quality_score,
//     embeddings_consistent
//   } = embeddingResponse.data;
//   if (!embedding || embedding.length === 0) {
//     throw new Error("Embedding generation failed");
//   }
//   const qdrantPointId = await saveToQdrant(
//     user.id,
//     embedding,
//     {
//       name: data.name,
//       email: data.email,
//       rollNumber: data.rollNumber,
//     }
//   );
//   await prisma.faceEmbedding.create({
//     data: {
//       userId: user.id,
//       frontImage: frontUrl,
//       leftImage: leftUrl,
//       rightImage: rightUrl,
//       qdrantPointId,
//       modelVersion: model_version ?? "v1",
//       qualityScore: average_quality_score,
//       consistent: embeddings_consistent
//     }
//   });
//   const token = signToken({ id: user.id, role: "student" });
//   return {
//     token,
//     warning: embeddings_consistent === false
//       ? "Face images are low quality. Consider retaking photos."
//       : undefined
//   };
// }
// //login endpoint
// export async function loginStudent(data: {
//   email: string;
//   password: string;
// }) {
//   const user = await prisma.user.findUnique({
//     where: { email: data.email },
//     include: {
//       roles: { include: { role: true } },
//       enrollments: {
//         include: {
//           subject: {
//             include: {
//               sessions: {
//                 include: {
//                   teacher: true
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   });
//   if (!user) {
//     throw new Error("Invalid user or password");
//   }
//    const isValid = await verifyPassword(data.password, user.hashPassword);
//   if (!isValid) {
//     throw new Error("Invalid user or password");
//   }
//    const role = user.roles[0]?.role.name ?? "student";
//   const token = signToken({ id: user.id, role });
//    const classes = user.enrollments.flatMap(enrollment =>
//     enrollment.subject.sessions.map(session => ({
//       id: session.id.toString(),
//       subject: enrollment.subject.name,
//       code: enrollment.subject.subjectCode,
//       professor: session.teacher.name,
//       room: session.room ?? "N/A",
//       timeString: session.startTime.toLocaleTimeString("en-IN", {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true
//       }),
//       durationMinutes: Math.floor(
//         (session.endTime.getTime() - session.startTime.getTime()) / 60000
//       )
//     }))
//   );
//   return {
//     token,
//     user: {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role,
//       branch: user.branch,
//       semester: user.semester,
//       classes
//     }
//   };
// }
export async function registerStudent(data) {
    if (!data.files?.frontFace?.[0] ||
        !data.files?.leftFace?.[0] ||
        !data.files?.rightFace?.[0]) {
        throw new Error("Front, left and right images are required");
    }
    const exists = await prisma.user.findUnique({
        where: { email: data.email }
    });
    if (exists)
        throw new Error("Email already registered");
    const hash = await passwordHash(data.password);
    const frontPath = data.files.frontFace[0].path;
    const leftPath = data.files.leftFace[0].path;
    const rightPath = data.files.rightFace[0].path;
    let frontUrl;
    let leftUrl;
    let rightUrl;
    try {
        frontUrl = await uploadImage(frontPath);
        leftUrl = await uploadImage(leftPath);
        rightUrl = await uploadImage(rightPath);
    }
    finally {
        fs.unlinkSync(frontPath);
        fs.unlinkSync(leftPath);
        fs.unlinkSync(rightPath);
    }
    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            hashPassword: hash,
            rollNumber: data.rollNumber,
            branch: data.branch,
            semester: Number(data.semester),
            roles: {
                create: {
                    role: {
                        connectOrCreate: {
                            where: { name: "student" },
                            create: { name: "student" }
                        }
                    }
                }
            }
        }
    });
    const subjectsWithSessions = await prisma.subject.findMany({
        where: {
            branch: data.branch,
            semester: Number(data.semester),
            sessions: { some: {} }
        }
    });
    if (subjectsWithSessions.length === 0) {
        console.warn(`⚠️ No active subjects for ${data.branch} semester ${data.semester}`);
    }
    else {
        await prisma.enrollment.createMany({
            data: subjectsWithSessions.map(s => ({
                studentId: user.id,
                subjectId: s.id
            })),
        });
    }
    const embeddingResponse = await embeddingClient.post("/", {
        image_urls: [frontUrl, leftUrl, rightUrl],
        student_id: String(user.id),
        name: data.name,
        roll_number: data.rollNumber,
        email: data.email
    });
    const { embedding, model_version, average_quality_score, embeddings_consistent } = embeddingResponse.data;
    if (!embedding?.length) {
        throw new Error("Embedding generation failed");
    }
    const qdrantPointId = await saveToQdrant(user.id, embedding, {
        name: data.name,
        email: data.email,
        rollNumber: data.rollNumber
    });
    await prisma.faceEmbedding.create({
        data: {
            userId: user.id,
            frontImage: frontUrl,
            leftImage: leftUrl,
            rightImage: rightUrl,
            qdrantPointId,
            modelVersion: model_version ?? "v1",
            qualityScore: average_quality_score,
            consistent: embeddings_consistent
        }
    });
    const token = signToken({ id: user.id, role: "student" });
    return { token };
}
export async function loginStudent(data) {
    /* ---------------- FETCH USER ---------------- */
    const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
            roles: {
                include: { role: true },
            },
            enrollments: {
                include: {
                    subject: {
                        include: {
                            sessions: {
                                include: {
                                    teacher: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new Error("Invalid user or password");
    }
    const isValid = await verifyPassword(data.password, user.hashPassword);
    if (!isValid) {
        throw new Error("Invalid user or password");
    }
    const role = user.roles[0]?.role.name ?? "STUDENT";
    const token = signToken({ id: user.id, role });
    /* ---------------- IST TODAY RANGE ---------------- */
    const now = new Date();
    // IST offset = +5:30
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const startOfTodayIST = new Date(new Date(now.getTime() + IST_OFFSET_MS)
        .setHours(0, 0, 0, 0) - IST_OFFSET_MS);
    const startOfTomorrowIST = new Date(startOfTodayIST);
    startOfTomorrowIST.setDate(startOfTomorrowIST.getDate() + 1);
    /* ---------------- BUILD TODAY'S CLASSES ---------------- */
    const classes = user.enrollments.flatMap(enrollment => enrollment.subject.sessions
        .filter(session => {
        return (session.sessionDate >= startOfTodayIST &&
            session.sessionDate < startOfTomorrowIST);
    })
        .map(session => {
        const startTime = session.startTime;
        const endTime = session.endTime;
        return {
            id: session.id.toString(),
            subject: enrollment.subject.name,
            code: enrollment.subject.subjectCode,
            professor: session.teacher.name,
            room: session.room ?? "N/A",
            timeString: `${startTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            })} - ${endTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            })}`,
            durationMinutes: (endTime.getTime() - startTime.getTime()) / 60000,
        };
    }));
    /* ---------------- RESPONSE ---------------- */
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            branch: user.branch,
            semester: user.semester,
            classes,
        },
    };
}
export async function getStudentAttendanceService(studentId) {
    console.log("📊 Fetching attendance for student:", studentId);
    /* ------------------ STUDENT BASIC INFO ------------------ */
    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            name: true,
            rollNumber: true,
            enrollments: {
                include: {
                    subject: true,
                },
            },
        },
    });
    if (!student) {
        throw new Error("Student not found");
    }
    /* ------------------ PER SUBJECT ATTENDANCE ------------------ */
    const subjectStats = [];
    let overallAttended = 0;
    let overallTotal = 0;
    for (const enrollment of student.enrollments) {
        const subject = enrollment.subject;
        // total sessions conducted for this subject
        const totalClasses = await prisma.classSession.count({
            where: { subjectId: subject.id },
        });
        // sessions attended by this student
        const attendedClasses = await prisma.attendance.count({
            where: {
                studentId,
                status: "PRESENT",
                session: {
                    subjectId: subject.id,
                },
            },
        });
        const percentage = totalClasses === 0
            ? 0
            : Number(((attendedClasses / totalClasses) * 100).toFixed(2));
        overallAttended += attendedClasses;
        overallTotal += totalClasses;
        subjectStats.push({
            subjectId: subject.id,
            code: subject.subjectCode,
            name: subject.name,
            totalClasses,
            attendedClasses,
            attendancePercentage: percentage,
        });
    }
    /* ------------------ OVERALL ATTENDANCE ------------------ */
    const overallAttendance = overallTotal === 0
        ? 0
        : Number(((overallAttended / overallTotal) * 100).toFixed(2));
    return {
        student: {
            id: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
        },
        subjects: subjectStats,
        overallAttendance,
    };
}
