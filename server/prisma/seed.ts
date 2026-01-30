import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { DayOfWeek } from '../src/generated/prisma/client'
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!, 
})

export const prisma = new PrismaClient({ adapter })
// async function main() {
//   console.log("🧹 Clearing old data...");

//   // ===============================
//   // DELETE OLD DATA (FK SAFE ORDER)
//   // ===============================
//   await prisma.attendance.deleteMany();
//   await prisma.classSession.deleteMany();
//   await prisma.timetable.deleteMany();
//   await prisma.subjectTeacher.deleteMany();
//   await prisma.enrollment.deleteMany();
//   await prisma.userRole.deleteMany();
//   await prisma.subject.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.role.deleteMany();

//   console.log("✅ Old data cleared");

//   console.log("🌱 Seeding fresh data...");

//   /* =====================================================
//      1️⃣ ROLES
//   ===================================================== */
//   const professorRole = await prisma.role.create({
//     data: { name: "PROFESSOR" },
//   });

//   /* =====================================================
//      2️⃣ PROFESSORS
//   ===================================================== */
//   await prisma.user.createMany({
//     data: [
//       { name: "Prof A", email: "a@uni.com", hashPassword: "x", branch: "CSE" },
//       { name: "Prof B", email: "b@uni.com", hashPassword: "x", branch: "CSE" },
//       { name: "Prof C", email: "c@uni.com", hashPassword: "x", branch: "CSE" },
//       { name: "Prof D", email: "d@uni.com", hashPassword: "x", branch: "CSE" },
//     ],
//   });

//   const professors = await prisma.user.findMany({
//     where: { email: { endsWith: "@uni.com" } },
//     orderBy: { id: "asc" },
//   });

//   await prisma.userRole.createMany({
//     data: professors.map(p => ({
//       userId: p.id,
//       roleId: professorRole.id,
//     })),
//   });

//   /* =====================================================
//      3️⃣ SUBJECTS
//   ===================================================== */
//   await prisma.subject.createMany({
//     data: [
//       { name: "Operating Systems", subjectCode: "CS301", branch: "CSE", semester: 3 },
//       { name: "DBMS", subjectCode: "CS302", branch: "CSE", semester: 3 },
//       { name: "Computer Networks", subjectCode: "CS303", branch: "CSE", semester: 3 },
//       { name: "Artificial Intelligence", subjectCode: "CS304", branch: "CSE", semester: 3 },
//     ],
//   });

//   const subjects = await prisma.subject.findMany({
//     orderBy: { id: "asc" },
//   });

//   /* =====================================================
//      4️⃣ SUBJECT ↔ PROFESSOR
//   ===================================================== */
//   await prisma.subjectTeacher.createMany({
//     data: subjects.map((subject, index) => ({
//       subjectId: subject.id,
//       teacherId: professors[index % professors.length].id,
//     })),
//   });

//   /* =====================================================
//      5️⃣ TIMETABLE (WITH ROOMS)
//   ===================================================== */
//   await prisma.timetable.createMany({
//     data: [
//       {
//         subjectId: subjects[0].id,
//         branch: "CSE",
//         semester: 3,
//         dayOfWeek: DayOfWeek.MONDAY,
//         startTime: "09:00",
//         endTime: "09:50",
//         room: "Lab 304",
//       },
//       {
//         subjectId: subjects[1].id,
//         branch: "CSE",
//         semester: 3,
//         dayOfWeek: DayOfWeek.TUESDAY,
//         startTime: "10:00",
//         endTime: "10:50",
//         room: "Room 210",
//       },
//       {
//         subjectId: subjects[2].id,
//         branch: "CSE",
//         semester: 3,
//         dayOfWeek: DayOfWeek.WEDNESDAY,
//         startTime: "11:00",
//         endTime: "11:50",
//         room: "Lab 101",
//       },
//       {
//         subjectId: subjects[3].id,
//         branch: "CSE",
//         semester: 3,
//         dayOfWeek: DayOfWeek.THURSDAY,
//         startTime: "09:00",
//         endTime: "09:50",
//         room: "Room 305",
//       },
//     ],
//   });

//   console.log("✅ Fresh seed completed successfully");
// }

// main()
//   .catch(err => {
//     console.error("❌ Seed failed:", err);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });


  // console.log("📚 Creating class sessions...");

  // // pick one date (today)
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);

  // const timetables = await prisma.timetable.findMany({
  //   include: {
  //     subject: {
  //       include: {
  //         teachers: {
  //           include: {
  //             teacher: true
  //           }
  //         }
  //       }
  //     }
  //   }
  // });

  // for (const tt of timetables) {
  //   const teacher = tt.subject.teachers[0]?.teacher;
  //   if (!teacher) continue;

  //   const [sh, sm] = tt.startTime.split(":").map(Number);
  //   const [eh, em] = tt.endTime.split(":").map(Number);

  //   const startTime = new Date(today);
  //   startTime.setHours(sh, sm, 0, 0);

  //   const endTime = new Date(today);
  //   endTime.setHours(eh, em, 0, 0);

  //   await prisma.classSession.create({
  //     data: {
  //       subjectId: tt.subjectId,
  //       teacherId: teacher.id,
  //       sessionDate: today,
  //       startTime,
  //       endTime,
  //       room: tt.room
  //     }
  //   });
  // }

  // console.log("✅ Class sessions created");



  async function seedRoles() {
  await prisma.role.createMany({
    data: [
      { name: "TEACHER" },
      { name: "STUDENT" },
      { name: "ADMIN" },
    ],
    
  });
}