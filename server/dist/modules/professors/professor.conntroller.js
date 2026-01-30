import { markAttendanceService, professorLoginService } from "./professor.services.js";
export async function professorLogin(req, res) {
    try {
        const result = await professorLoginService(req.body);
        res.json(result);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function markAttendance(req, res) {
    try {
        const sessionId = Number(req.body.sessionId);
        const files = req.files;
        if (!sessionId) {
            return res.status(400).json({ message: "sessionId required" });
        }
        if (!files || files.length !== 3) {
            return res
                .status(400)
                .json({ message: "Exactly 3 classroom images required" });
        }
        const result = await markAttendanceService({
            sessionId,
            files
        });
        res.json(result);
    }
    catch (error) {
        console.error("❌ Attendance error:", error);
        res.status(500).json({ message: "Attendance failed" });
    }
}
