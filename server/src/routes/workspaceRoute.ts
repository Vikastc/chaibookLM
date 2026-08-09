import { Router } from "express";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "../controllers/workspaceController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

workspaceRouter.get("/", listWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.get("/:workspaceId", getWorkspace);
workspaceRouter.patch("/:workspaceId", updateWorkspace);
workspaceRouter.delete("/:workspaceId", deleteWorkspace);
