import { prisma } from "../../db/prisma.js";
import { embeddingClient } from "../../lib/axios.js";
import { saveToQdrant } from "../../lib/qdrantService.js";
import { uploadImage } from "../../utlils/cloudinary.js";
import { passwordHash, verifyPassword } from "../../utlils/hash.js";
import { signToken } from "../../utlils/jwt.js";
import fs from "fs"

export interface EmbeddingResponse {
  embedding: number[];
  model_version?: string;
  average_quality_score?: number;
  embeddings_consistent?: boolean;
  status?: string;
  message?: string;
}

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

export async function registerStudent(data: {
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  branch: string;
  semester: string;
  files: any;
}) {

  if (
    !data.files?.frontFace?.[0] ||
    !data.files?.leftFace?.[0] ||
    !data.files?.rightFace?.[0]
  ) {
    throw new Error("Front, left and right images are required");
  }

  const exists = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (exists) throw new Error("Email already registered");

  const hash = await passwordHash(data.password);

 

  const frontPath = data.files.frontFace[0].path;
  const leftPath = data.files.leftFace[0].path;
  const rightPath = data.files.rightFace[0].path;

  let frontUrl!: string;
  let leftUrl!: string;
  let rightUrl!: string;

  try {
    frontUrl = await uploadImage(frontPath);
    leftUrl = await uploadImage(leftPath);
    rightUrl = await uploadImage(rightPath);
  } finally {
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
    console.warn(
      `⚠️ No active subjects for ${data.branch} semester ${data.semester}`
    );
  } else {
    await prisma.enrollment.createMany({
      data: subjectsWithSessions.map(s => ({
        studentId: user.id,
        subjectId: s.id
      })),
      
    });
  }

  

  const embeddingResponse = await embeddingClient.post<EmbeddingResponse>(
    "/",
    {
      image_urls: [frontUrl, leftUrl, rightUrl],
      student_id: String(user.id),
      name: data.name,
      roll_number: data.rollNumber,
      email: data.email
    }
  );

  const {
    embedding,
    model_version,
    average_quality_score,
    embeddings_consistent
  } = embeddingResponse.data;

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

export async function loginStudent(data: {
  email: string;
  password: string;
}) {

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      roles: { include: { role: true } },
      enrollments: {
        include: {
          subject: {
            include: {
              sessions: {
                include: { teacher: true }
              }
            }
          }
        }
      }
    }
  });

  if (!user) throw new Error("Invalid user or password");

  const isValid = await verifyPassword(data.password, user.hashPassword);
  if (!isValid) throw new Error("Invalid user or password");

  const role = user.roles[0]?.role.name ?? "student";
  const token = signToken({ id: user.id, role });

  const classes = user.enrollments.flatMap(e =>
    e.subject.sessions.map(s => ({
      id: s.id.toString(),
      subject: e.subject.name,
      code: e.subject.subjectCode,
      professor: s.teacher.name,
      room: s.room ?? "N/A",
      timeString: s.startTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }),
      durationMinutes:
        (s.endTime.getTime() - s.startTime.getTime()) / 60000
    }))
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      branch: user.branch,
      semester: user.semester,
      classes
    }
  };
}
