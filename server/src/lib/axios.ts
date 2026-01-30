import axios from "axios";

export const embeddingClient = axios.create({
  baseURL: "http://10.168.185.18:8001/api/v1/register",
 
});

export const markAttendance = axios.create({
  baseURL: "http://192.168.9.18:8000/api/v1/attendance",
 
});




















