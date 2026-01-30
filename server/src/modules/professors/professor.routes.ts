import { Router } from "express";
import { login } from "../students/student.controllers.js";
import { markAttendance, professorLogin } from "./professor.conntroller.js";
import { upload } from "../../utlils/multer.js";

const router=Router()




router.post("/login",professorLogin)
router.post(
  "/mark",
  upload.array("images", 3),
  markAttendance
);


export default router