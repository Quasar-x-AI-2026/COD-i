import { loginStudent, registerStudent } from "./student.services.js";
export async function register(req, res) {
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
        console.log("done");
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
}
export async function login(req, res) {
    try {
        console.log(req.body);
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const result = await loginStudent(req.body);
        console.log(result);
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
}
