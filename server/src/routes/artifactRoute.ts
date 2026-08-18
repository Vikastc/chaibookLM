import { Router } from "express";
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifacts,
} from "../controllers/artifactController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const artifactRouter = Router({ mergeParams: true });

artifactRouter.use(requireAuth);

artifactRouter.get("/", listArtifacts);
artifactRouter.post("/", createArtifact);
artifactRouter.get("/:artifactId", getArtifact);
artifactRouter.delete("/:artifactId", deleteArtifact);
