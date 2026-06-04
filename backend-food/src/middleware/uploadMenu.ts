import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve(
  process.env.UPLOADS_DIR || "./uploads",
  "menu"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Apenas imagens são permitidas"));
};

const fileFilterAI = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Apenas imagens ou PDF são permitidos"));
};

export const uploadMenu = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadAI = multer({ storage, fileFilter: fileFilterAI, limits: { fileSize: 20 * 1024 * 1024 } });
