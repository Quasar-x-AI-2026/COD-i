import { prisma } from "../../db/prisma.js";
import { signToken } from "../../utlils/jwt.js";

export async function professorLoginService(data: {
  email: string,
  password: string,
  adminCode: string
}) {
  console.log(data.adminCode)
  console.log(process.env.ADMIN_CODE)
  if (data.adminCode != process.env.ADMIN_CODE) {
    throw new Error("Invalid Code")
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isProfessor = user.roles.some(
    (r: any) => r.role.name === "PROFESSOR"
  )

  if (!isProfessor) {
    throw new Error("Invalid role")
  }

  if (data.password !== user.hashPassword) {
    throw new Error("Invalid credentials")
  }
  const role = user.roles[0]?.role.name
  const token = signToken({
    id: user.id,
    role
  })

  return token
}