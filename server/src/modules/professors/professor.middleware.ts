import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utlils/jwt.js";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);

    req.user = decoded;  

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
