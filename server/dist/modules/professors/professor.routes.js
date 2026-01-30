import { Router } from "express";
import { login } from "../students/student.controllers.js";
const router = Router();
router.post("/login", login);
export default router;
