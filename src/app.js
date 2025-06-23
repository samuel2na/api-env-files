import express from "express";
import helmet from "helmet";
import cors from 'cors';
import morgan from "morgan";

// Importa a instância do Multer e a função controladora
import { uploadMiddleware, uploadController } from "./upload.js"; // <-- ALTERADO AQUI

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

const app = express();

app.use(helmet()); // Security middleware to set various HTTP headers
app.use(express.json()); // Middleware to parse JSON bodies
app.use(morgan("dev")); // HTTP request logger middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Define a rota de upload, encadeando o middleware do Multer com o controlador
app.post("/upload", uploadMiddleware, uploadController); // <-- ALTERADO AQUI

app.get('/debug-env', (req, res) => {
  res.send({
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    NODE_ENV: process.env.NODE_ENV
  });
});

// Rota de teste
app.use("/", (req, res, next) => {
    res.send("Hello World - test start !");
});

export default app;