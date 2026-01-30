import bcrypt from "bcryptjs";
export const passwordHash = async (password) => {
    return bcrypt.hash(password, 10);
};
export const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
