import jwt from 'jsonwebtoken';
const JWT_SECRET = "secret";
export const signToken = (payload) => {
    console.log("here");
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
