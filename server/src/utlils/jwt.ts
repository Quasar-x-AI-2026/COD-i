import jwt, { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET="secret";
export interface TokenPayload {
  id: number;
  role: string;
}
export const signToken=(payload:object)=>{
    console.log("here")
    return jwt.sign(payload,JWT_SECRET,{expiresIn:"7d"})
}

export const verifyToken=(token:string)=>{
    return jwt.verify(token,JWT_SECRET) as TokenPayload
}
