import express from "express";
import dotenv from "dotenv";
import studentRoutes from "./modules/students/student.routes.js";
dotenv.config();
const app = express();
app.use("/student", studentRoutes);
app.listen(3000, () => {
    console.log("server is up ji mast chal raha hai ");
});
