import { prisma } from "../src/db/prisma";

const COMMON_PASSWORD = "admin123";

/* ---------------------------------- */
/* HELPERS                            */
/* ---------------------------------- */

function dateWithTime(base: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/* ---------------------------------- */
/* MAIN SEED                          */
/* ---------------------------------- */

async function main() {
  console.log("🔥 FULL HARD RESET (USERS + ACADEMIC)");

  /* ---------------- DELETE EVERYTHING ---------------- */

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

  console.log("🧹 Database fully cleared");

 

  const studentRole = await prisma.role.create({
    data: { name: "student" },
  });

  const teacherRole = await prisma.role.create({
    data: { name: "TEACHER" },
  });


  const professorsData = [
    { name: "Dr. Sharma", email: "sharma@college.edu" },
    { name: "Dr. Verma", email: "verma@college.edu" },
    { name: "Dr. Mehta", email: "mehta@college.edu" },
  ];

  const professors = [];

  for (const prof of professorsData) {
    const teacher = await prisma.user.create({
      data: {
        name: prof.name,
        email: prof.email,
        hashPassword: COMMON_PASSWORD,
        roles: {
          create: {
            roleId: teacherRole.id,
          },
        },
      },
    });

    professors.push(teacher);
  }


  const student = await prisma.user.create({
    data: {
      name: "Abhijit Kumar",
      email: "abhijit@example.com",
      rollNumber: "CSE-098",
      branch: "CSE",
      semester: 3,
      hashPassword: COMMON_PASSWORD,
      roles: {
        create: {
          roleId: studentRole.id,
        },
      },
    },
  });


  const subjects = await Promise.all([
    prisma.subject.create({
      data: {
        name: "DBMS",
        subjectCode: "CSE301",
        branch: "CSE",
        semester: 3,
      },
    }),
    prisma.subject.create({
      data: {
        name: "Computer Networks",
        subjectCode: "CSE302",
        branch: "CSE",
        semester: 3,
      },
    }),
    prisma.subject.create({
      data: {
        name: "Operating Systems",
        subjectCode: "CSE303",
        branch: "CSE",
        semester: 3,
      },
    }),
  ]);


  for (let i = 0; i < subjects.length; i++) {
    await prisma.subjectTeacher.create({
      data: {
        subjectId: subjects[i].id,
        teacherId: professors[i].id,
      },
    });
  }


  await prisma.enrollment.createMany({
    data: subjects.map((s) => ({
      studentId: student.id,
      subjectId: s.id,
    })),
  });


  console.log("📅 Creating 3 classes for TODAY");

  const today = new Date();
  today.setHours(12, 0, 0, 0); 

  const slots = [
    { subject: subjects[0], teacher: professors[0], start: "09:00", end: "10:00" },
    { subject: subjects[1], teacher: professors[1], start: "10:00", end: "11:00" },
    { subject: subjects[2], teacher: professors[2], start: "11:00", end: "12:00" },
  ];

  for (const slot of slots) {
    await prisma.classSession.create({
      data: {
        subjectId: slot.subject.id,
        teacherId: slot.teacher.id,
        sessionDate: today,
        startTime: dateWithTime(today, slot.start),
        endTime: dateWithTime(today, slot.end),
        room: "Room 101",
      },
    });
  }

  console.log("✅ HARD RESET COMPLETE");
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
