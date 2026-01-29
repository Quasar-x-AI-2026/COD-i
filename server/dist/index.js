import express from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.listen(3000, () => {
    console.log("server is up ji mast chal raha hai ");
});
