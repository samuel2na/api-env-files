import express from "express";
import helmet from "helmet";
import cors from 'cors';
import morgan from "morgan";

// Importa a instância do Multer e a função controladora
import { uploadMiddleware, uploadController } from "./upload.js"; // <-- ALTERADO AQUI

const app = express();

app.use(helmet()); // Security middleware to set various HTTP headers
app.use(express.json()); // Middleware to parse JSON bodies
app.use(morgan("dev")); // HTTP request logger middleware
// app.use(cors(
//     { origin: process.env.CORS_ORIGIN, }
// ));

// Define a rota de upload, encadeando o middleware do Multer com o controlador
app.post("/upload", uploadMiddleware, uploadController); // <-- ALTERADO AQUI

// Rota de teste
app.use("/", (req, res, next) => {
    res.send("Hello World - test start !");
});

export default app;