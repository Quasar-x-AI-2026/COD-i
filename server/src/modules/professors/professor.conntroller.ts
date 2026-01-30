import type { Request,Response } from "express"
import { professorLoginService } from "./professor.services.js"

export async function professorLogin(req: Request, res: Response) {
  try {
    console.log(req.body)
    const result = await professorLoginService(req.body)
    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
}