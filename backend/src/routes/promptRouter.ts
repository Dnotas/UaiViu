import { Router } from "express";
import * as PromptController from "../controllers/PromptController";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const promptRoutes = Router();

promptRoutes.get("/prompt", isAuth, PromptController.index);

promptRoutes.post("/prompt", isAuth, PromptController.store);

promptRoutes.get("/prompt/:promptId", isAuth, PromptController.show);

promptRoutes.put("/prompt/:promptId", isAuth, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, PromptController.remove);

promptRoutes.post("/prompt/:promptId/media", isAuth, upload.single("file"), PromptController.uploadMedia);

promptRoutes.delete("/prompt/:promptId/media/:fileName", isAuth, PromptController.deleteMedia);

export default promptRoutes;
