import { Router } from "express";
import {
  bulkDeleteSources,
  createSource,
  deleteSource,
  getSource,
  importWebsite,
  importYoutube,
  listSources,
  uploadPdf,
} from "../controllers/sourceController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadSinglePdf } from "../middleware/upload.js";

export const sourceRouter = Router({ mergeParams: true });

sourceRouter.use(requireAuth);

sourceRouter.get("/", listSources);
sourceRouter.post("/", createSource);
sourceRouter.post("/bulk-delete", bulkDeleteSources);
sourceRouter.post("/pdf", uploadSinglePdf, uploadPdf);
sourceRouter.post("/website", importWebsite);
sourceRouter.post("/youtube", importYoutube);
sourceRouter.get("/:sourceId", getSource);
sourceRouter.delete("/:sourceId", deleteSource);
