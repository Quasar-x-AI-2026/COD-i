import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { DayOfWeek } from '../src/generated/prisma/client'
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ adapter })
// // async function main() {
// //   console.log("🧹 Clearing old data...");

// //   // ===============================
// //   // DELETE OLD DATA (FK SAFE ORDER)
// //   // ===============================
// //   await prisma.attendance.deleteMany();
// //   await prisma.classSession.deleteMany();
// //   await prisma.timetable.deleteMany();
// //   await prisma.subjectTeacher.deleteMany();
// //   await prisma.enrollment.deleteMany();
// //   await prisma.userRole.deleteMany();
// //   await prisma.subject.deleteMany();
// //   await prisma.user.deleteMany();
// //   await prisma.role.deleteMany();

// //   console.log("✅ Old data cleared");

// //   console.log("🌱 Seeding fresh data...");

// //   /* =====================================================
// //      1️⃣ ROLES
// //   ===================================================== */
// //   const professorRole = await prisma.role.create({
// //     data: { name: "PROFESSOR" },
// //   });

// //   /* =====================================================
// //      2️⃣ PROFESSORS
// //   ===================================================== */
// //   await prisma.user.createMany({
// //     data: [
// //       { name: "Prof A", email: "a@uni.com", hashPassword: "x", branch: "CSE" },
// //       { name: "Prof B", email: "b@uni.com", hashPassword: "x", branch: "CSE" },
// //       { name: "Prof C", email: "c@uni.com", hashPassword: "x", branch: "CSE" },
// //       { name: "Prof D", email: "d@uni.com", hashPassword: "x", branch: "CSE" },
// //     ],
// //   });

// //   const professors = await prisma.user.findMany({
// //     where: { email: { endsWith: "@uni.com" } },
// //     orderBy: { id: "asc" },
// //   });

// //   await prisma.userRole.createMany({
// //     data: professors.map(p => ({
// //       userId: p.id,
// //       roleId: professorRole.id,
// //     })),
// //   });

// //   /* =====================================================
// //      3️⃣ SUBJECTS
// //   ===================================================== */
// //   await prisma.subject.createMany({
// //     data: [
// //       { name: "Operating Systems", subjectCode: "CS301", branch: "CSE", semester: 3 },
// //       { name: "DBMS", subjectCode: "CS302", branch: "CSE", semester: 3 },
// //       { name: "Computer Networks", subjectCode: "CS303", branch: "CSE", semester: 3 },
// //       { name: "Artificial Intelligence", subjectCode: "CS304", branch: "CSE", semester: 3 },
// //     ],
// //   });

// //   const subjects = await prisma.subject.findMany({
// //     orderBy: { id: "asc" },
// //   });

// //   /* =====================================================
// //      4️⃣ SUBJECT ↔ PROFESSOR
// //   ===================================================== */
// //   await prisma.subjectTeacher.createMany({
// //     data: subjects.map((subject, index) => ({
// //       subjectId: subject.id,
// //       teacherId: professors[index % professors.length].id,
// //     })),
// //   });

// //   /* =====================================================
// //      5️⃣ TIMETABLE (WITH ROOMS)
// //   ===================================================== */
// //   await prisma.timetable.createMany({
// //     data: [
// //       {
// //         subjectId: subjects[0].id,
// //         branch: "CSE",
// //         semester: 3,
// //         dayOfWeek: DayOfWeek.MONDAY,
// //         startTime: "09:00",
// //         endTime: "09:50",
// //         room: "Lab 304",
// //       },
// //       {
// //         subjectId: subjects[1].id,
// //         branch: "CSE",
// //         semester: 3,
// //         dayOfWeek: DayOfWeek.TUESDAY,
// //         startTime: "10:00",
// //         endTime: "10:50",
// //         room: "Room 210",
// //       },
// //       {
// //         subjectId: subjects[2].id,
// //         branch: "CSE",
// //         semester: 3,
// //         dayOfWeek: DayOfWeek.WEDNESDAY,
// //         startTime: "11:00",
// //         endTime: "11:50",
// //         room: "Lab 101",
// //       },
// //       {
// //         subjectId: subjects[3].id,
// //         branch: "CSE",
// //         semester: 3,
// //         dayOfWeek: DayOfWeek.THURSDAY,
// //         startTime: "09:00",
// //         endTime: "09:50",
// //         room: "Room 305",
// //       },
// //     ],
// //   });

// //   console.log("✅ Fresh seed completed successfully");
// // }

// // main()
// //   .catch(err => {
// //     console.error("❌ Seed failed:", err);
// //     process.exit(1);
// //   })
// //   .finally(async () => {
// //     await prisma.$disconnect();
// //   });


// // console.log("📚 Creating class sessions...");

// // // pick one date (today)
// // const today = new Date();
// // today.setHours(0, 0, 0, 0);

// // const timetables = await prisma.timetable.findMany({
// //   include: {
// //     subject: {
// //       include: {
// //         teachers: {
// //           include: {
// //             teacher: true
// //           }
// //         }
// //       }
// //     }
// //   }
// // });

// // for (const tt of timetables) {
// //   const teacher = tt.subject.teachers[0]?.teacher;
// //   if (!teacher) continue;

// //   const [sh, sm] = tt.startTime.split(":").map(Number);
// //   const [eh, em] = tt.endTime.split(":").map(Number);

// //   const startTime = new Date(today);
// //   startTime.setHours(sh, sm, 0, 0);

// //   const endTime = new Date(today);
// //   endTime.setHours(eh, em, 0, 0);

// //   await prisma.classSession.create({
// //     data: {
// //       subjectId: tt.subjectId,
// //       teacherId: teacher.id,
// //       sessionDate: today,
// //       startTime,
// //       endTime,
// //       room: tt.room
// //     }
// //   });
// // }

// // console.log("✅ Class sessions created");



// // async function seedRoles() {
// //   const roles = ["ADMIN", "TEACHER", "STUDENT"];

// //   for (const name of roles) {
// //     await prisma.role.upsert({
// //       where: { name },
// //       update: {},
// //       create: { name },
// //     });
// //   }

// //   console.log("Roles seeded safely");
// // }



// // seedRoles()
// // async function seedProfessors() {
// //   const teachers = [
// //     {
// //       name: "Dr. Amit Sharma",
// //       email: "amit.sharma@iiit.ac.in",
// //       branch: "CSE",
// //     },
// //     {
// //       name: "Dr. Neha Verma",
// //       email: "neha.verma@iiit.ac.in",
// //       branch: "ECE",
// //     },
// //     {
// //       name: "Dr. Rohan Mehta",
// //       email: "rohan.mehta@iiit.ac.in",
// //       branch: "MnC",
// //     },
// //   ];

// //   const teacherRole = await prisma.role.findUnique({
// //     where: { name: "TEACHER" },
// //   });

// //   if (!teacherRole) throw new Error("Teacher role missing");

// //   for (const teacher of teachers) {
// //     const user = await prisma.user.upsert({
// //       where: { email: teacher.email },
// //       update: {},
// //       create: {
// //         name: teacher.name,
// //         email: teacher.email,
// //         hashPassword: "dummyhash", // replace later
// //         branch: teacher.branch,
// //         roles: {
// //           create: {
// //             roleId: teacherRole.id,
// //           },
// //         },
// //       },
// //     });

// //     console.log("Seeded teacher:", user.name);
// //   }
// // }

// // seedProfessors()


// async function seedTimetable() {
//   const timetableData = [
//     // ===== CSE SEM 3 =====
//     {
//       branch: "CSE",
//       semester: 3,
//       subjectCode: "CSE201",
//       schedule: [
//         { day: "MONDAY", start: "10:00", end: "11:00", room: "LH-101" },
//         { day: "TUESDAY", start: "09:00", end: "10:00", room: "LH-101" },
//         { day: "WEDNESDAY", start: "10:00", end: "11:00", room: "LH-101" },
//         { day: "THURSDAY", start: "11:00", end: "12:00", room: "LH-101" },
//         { day: "FRIDAY", start: "09:00", end: "10:00", room: "LH-101" },
//         { day: "SATURDAY", start: "10:00", end: "11:00", room: "LH-101" },
//       ],
//     },

//     // ===== ECE SEM 3 =====
//     {
//       branch: "ECE",
//       semester: 3,
//       subjectCode: "ECE201",
//       schedule: [
//         { day: "MONDAY", start: "11:00", end: "12:00", room: "LH-202" },
//         { day: "TUESDAY", start: "10:00", end: "11:00", room: "LH-202" },
//         { day: "WEDNESDAY", start: "11:00", end: "12:00", room: "LH-202" },
//         { day: "THURSDAY", start: "09:00", end: "10:00", room: "LH-202" },
//         { day: "FRIDAY", start: "10:00", end: "11:00", room: "LH-202" },
//         { day: "SATURDAY", start: "09:00", end: "10:00", room: "LH-202" },
//       ],
//     },

//     // ===== MnC SEM 1 =====
//     {
//       branch: "MnC",
//       semester: 1,
//       subjectCode: "MNC101",
//       schedule: [
//         { day: "MONDAY", start: "08:00", end: "09:00", room: "LH-303" },
//         { day: "TUESDAY", start: "08:00", end: "09:00", room: "LH-303" },
//         { day: "WEDNESDAY", start: "08:00", end: "09:00", room: "LH-303" },
//         { day: "THURSDAY", start: "08:00", end: "09:00", room: "LH-303" },
//         { day: "FRIDAY", start: "08:00", end: "09:00", room: "LH-303" },
//         { day: "SATURDAY", start: "08:00", end: "09:00", room: "LH-303" },
//       ],
//     },
//   ];

//   for (const entry of timetableData) {
//     const subject = await prisma.subject.findUnique({
//       where: { subjectCode: entry.subjectCode },
//     });

//     if (!subject) {
//       console.warn(`Subject not found: ${entry.subjectCode}`);
//       continue;
//     }

//     for (const slot of entry.schedule) {
//       await prisma.timetable.create({
//         data: {
//           branch: entry.branch,
//           semester: entry.semester,
//           subjectId: subject.id,
//           dayOfWeek: slot.day as any,
//           startTime: slot.start,
//           endTime: slot.end,
//           room: slot.room,
//         },
//       });
//     }
//   }

//   console.log("✅ Timetable seeded (Monday → Saturday)");
// }



// seedTimetable()



/* ------------------------ helpers ------------------------ */

// const DAY_MAP: Record<DayOfWeek, number> = {
//   MONDAY: 1,
//   TUESDAY: 2,
//   WEDNESDAY: 3,
//   THURSDAY: 4,
//   FRIDAY: 5,
//   SATURDAY: 6
// };

// function nextDateForDay(day: DayOfWeek) {
//   const today = new Date();
//   const target = DAY_MAP[day];
//   const diff = (target + 7 - today.getDay()) % 7 || 7;

//   today.setDate(today.getDate() + diff);
//   today.setHours(0, 0, 0, 0);
//   return today;
// }

// function timeOnDate(base: Date, time: string) {
//   const [h, m] = time.split(":").map(Number);
//   const d = new Date(base);
//   d.setHours(h, m, 0, 0);
//   return d;
// }

// /* ------------------------ seed ------------------------ */

// async function seed() {
//   console.log("🧹 Cleaning old data...");

//   await prisma.attendance.deleteMany();
//   await prisma.classSession.deleteMany();
//   await prisma.enrollment.deleteMany();
//   await prisma.subjectTeacher.deleteMany();
//   await prisma.timetable.deleteMany();
//   await prisma.subject.deleteMany();
//   await prisma.userRole.deleteMany();
//   await prisma.role.deleteMany();
//   await prisma.user.deleteMany();

//   console.log("✅ Old data removed");

//   /* ---------------- Roles ---------------- */

//   const studentRole = await prisma.role.create({ data: { name: "student" } });
//   const teacherRole = await prisma.role.create({ data: { name: "teacher" } });

//   /* ---------------- Users ---------------- */

//   const teacher = await prisma.user.create({
//     data: {
//       name: "Dr. Sharma",
//       email: "sharma@college.edu",
//       hashPassword: "hashed",
//       branch: "CSE",
//       semester: 3,
//       roles: {
//         create: { roleId: teacherRole.id }
//       }
//     }
//   });

//   const student = await prisma.user.create({
//     data: {
//       name: "Abhijit",
//       email: "abhijit@gmail.com",
//       hashPassword: "hashed",
//       branch: "CSE",
//       semester: 3,
//       roles: {
//         create: { roleId: studentRole.id }
//       }
//     }
//   });

//   /* ---------------- Subjects ---------------- */

//   const dsa = await prisma.subject.create({
//     data: {
//       subjectCode: "CSE201",
//       name: "Data Structures",
//       branch: "CSE",
//       semester: 3
//     }
//   });

//   /* ---------------- Subject ↔ Teacher ---------------- */

//   await prisma.subjectTeacher.create({
//     data: {
//       subjectId: dsa.id,
//       teacherId: teacher.id
//     }
//   });

//   /* ---------------- Enrollment ---------------- */

//   await prisma.enrollment.create({
//     data: {
//       studentId: student.id,
//       subjectId: dsa.id
//     }
//   });

//   /* ---------------- Timetable ---------------- */

//   const timetableEntries = [
//     { dayOfWeek: DayOfWeek.MONDAY, start: "10:00", end: "11:00" },
//     { dayOfWeek: DayOfWeek.WEDNESDAY, start: "10:00", end: "11:00" },
//     { dayOfWeek: DayOfWeek.FRIDAY, start: "10:00", end: "11:00" }
//   ];

//   for (const tt of timetableEntries) {
//     await prisma.timetable.create({
//       data: {
//         branch: "CSE",
//         semester: 3,
//         subjectId: dsa.id,
//         dayOfWeek: tt.dayOfWeek,
//         startTime: tt.start,
//         endTime: tt.end,
//         room: "LH-101"
//       }
//     });
//   }

//   /* ---------------- Class Sessions ---------------- */

//   console.log("📅 Creating class sessions...");

//   const timetables = await prisma.timetable.findMany({
//     include: {
//       subject: {
//         include: {
//           teachers: true
//         }
//       }
//     }
//   });

//   for (const tt of timetables) {
//     if (!tt.dayOfWeek) continue;

//     const baseDate = nextDateForDay(tt.dayOfWeek);

//     for (const st of tt.subject.teachers) {
//       await prisma.classSession.create({
//         data: {
//           subjectId: tt.subjectId,
//           teacherId: st.teacherId,
//           sessionDate: baseDate,
//           startTime: timeOnDate(baseDate, tt.startTime),
//           endTime: timeOnDate(baseDate, tt.endTime),
//           room: tt.room ?? "N/A"
//         }
//       });
//     }
//   }

//   console.log("🎉 Seeding complete!");
// }

// /* ---------------- run ---------------- */

// seed()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());

 
const COMMON_PASSWORD = "admin123"; // ❗ NOT HASHED

async function main() {
  console.log("🔥 Wiping database...");

  // ---- DELETE IN FK SAFE ORDER ----
  await prisma.attendance.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.subjectTeacher.deleteMany();
  await prisma.faceEmbedding.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Database cleared");

  // ---- ROLE ----
  const teacherRole = await prisma.role.create({
    data: { name: "TEACHER" }
  });

  // ---- PROFESSORS ----
  const professorsData = [
    { name: "Dr. Sharma", email: "sharma@college.edu" },
    { name: "Dr. Verma", email: "verma@college.edu" },
    { name: "Dr. Mehta", email: "mehta@college.edu" },
    { name: "Dr. Rao", email: "rao@college.edu" },
    { name: "Dr. Singh", email: "singh@college.edu" }
  ];

  const professors = [];
  for (const prof of professorsData) {
    const user = await prisma.user.create({
      data: {
        name: prof.name,
        email: prof.email,
        hashPassword: COMMON_PASSWORD,
        roles: {
          create: { roleId: teacherRole.id }
        }
      }
    });
    professors.push(user);
  }

  // ---- SUBJECTS (ALL BRANCHES + SEMESTERS) ----
  const data = {
    CSE: {
      1: ["Programming Fundamentals", "Mathematics I"],
      2: ["Data Structures", "Discrete Mathematics"],
      3: ["DBMS", "Computer Networks"],
      4: ["Software Engineering", "Artificial Intelligence"]
    },
    ECE: {
      1: ["Basic Electronics", "Mathematics I"],
      2: ["Analog Circuits", "Signals & Systems"],
      3: ["Digital Communication", "Microprocessors"],
      4: ["VLSI Design", "Embedded Systems"]
    },
    MNC: {
      1: ["Calculus", "Linear Algebra"],
      2: ["Probability", "Data Structures"],
      3: ["Numerical Methods", "Optimization"],
      4: ["Machine Learning", "Deep Learning"]
    },
    MAE: {
      1: ["Engineering Mechanics", "Mathematics I"],
      2: ["Thermodynamics", "Material Science"],
      3: ["Fluid Mechanics", "Manufacturing Process"],
      4: ["Heat Transfer", "CAD CAM"]
    }
  };

  const timetableSlots = [
    { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00" },
    { dayOfWeek: "WEDNESDAY", startTime: "10:00", endTime: "11:00" },
    { dayOfWeek: "FRIDAY", startTime: "11:00", endTime: "12:00" }
  ];

  for (const branch of Object.keys(data)) {
    for (const semKey of Object.keys(data[branch])) {
      const semester = Number(semKey);

      for (const subjectName of data[branch][semester]) {
        const subject = await prisma.subject.create({
          data: {
            subjectCode: `${branch}${semester}${Math.floor(Math.random() * 100)}`,
            name: subjectName,
            branch,
            semester
          }
        });

        const professor =
          professors[Math.floor(Math.random() * professors.length)];

        // Subject ↔ Professor
        await prisma.subjectTeacher.create({
          data: {
            subjectId: subject.id,
            teacherId: professor.id
          }
        });

        // Timetable
        for (const slot of timetableSlots) {
          await prisma.timetable.create({
            data: {
              subjectId: subject.id,
              branch,
              semester,
              ...slot
            }
          });
        }

        // Class Session
        await prisma.classSession.create({
          data: {
            subjectId: subject.id,
            teacherId: professor.id,
            sessionDate: new Date(),
            startTime: new Date(),
            endTime: new Date(),
            room: "Room 101"
          }
        });
      }
    }
  }

  console.log("✅ FULL DATABASE SEEDED SUCCESSFULLY");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

