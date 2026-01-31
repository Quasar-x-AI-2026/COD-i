import { verifyPassword } from "../../utlils/hash.js";
import { signToken } from "../../utlils/jwt.js";
import { getStudentAttendanceService, loginStudent, registerStudent } from "./student.services.js";
import type { Request,Response } from "express";
export async function register(req: Request, res: Response) {
  try {
    

    const result = await registerStudent({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      rollNumber: req.body.rollNumber,
      branch: req.body.branch,
      semester: req.body.semester,
      files: req.files
    });
    console.log("done")

    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    console.log(req.body)

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "All fields are required"
      })
    }

    const result = await loginStudent(req.body)

    console.log(result)
    return res.json(result)

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    })
  }
}


export const getStudentAttendance = async (req:Request, res:Response) => {
  const studentId = Number(req.params.studentId);

  const data = await getStudentAttendanceService(studentId);

  res.json(data);
};

