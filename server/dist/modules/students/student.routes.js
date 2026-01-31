import { Router } from "express";
import { upload } from "../../utlils/multer.js";
import { getStudentAttendance, login, register } from "./student.controllers.js";
import { requireAuth } from "./student.middlewares.js";
const router = Router();
router.post("/register", upload.fields([
    { name: "frontFace", maxCount: 1 },
    { name: "leftFace", maxCount: 1 },
    { name: "rightFace", maxCount: 1 },
]), register);
router.post("/login", login);
router.get("/:studentId/attendance", requireAuth, getStudentAttendance);
export default router;
