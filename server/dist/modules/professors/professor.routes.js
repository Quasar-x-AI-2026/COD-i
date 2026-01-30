import { Router } from "express";
import { markAttendance, professorLogin } from "./professor.conntroller.js";
import { upload } from "../../utlils/multer.js";
const router = Router();
router.post("/login", professorLogin);
router.post("/mark", upload.array("images", 3), markAttendance);
export default router;
