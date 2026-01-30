export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      JWT_SECRET?: string;
      CLOUDINARY_CLOUD_NAME:string;
      CLOUDINARY_API_KEY:string;
      CLOUDINARY_API_SECRET:string;
      ADMIN_CODE:string;


    }
  }
}

import "express"
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      role: string;
    };
  }
}