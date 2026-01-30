import express from "express"
import dotenv from "dotenv"
import studentRoutes from "./modules/students/student.routes.js"
import professorRoutes from "./modules/professors/professor.routes.js"
import cors from "cors"
dotenv.config()

const app=express()
app.use(cors(
    {
        origin:"*"
    }
))
app.use(express.json())
app.use("/student",studentRoutes)
app.use("/professor",professorRoutes)

app.listen(3000,()=>{
    console.log("server is up and running")
})