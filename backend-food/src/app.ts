import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import AppError from "./errors/AppError";
import routes from "./routes";

const app = express();

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => callback(null, true)
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Servir uploads (fotos do cardápio)
app.use("/uploads", express.static(path.resolve(process.env.UPLOADS_DIR || "./uploads")));

app.use("/api/food", routes);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
