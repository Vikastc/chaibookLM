import { Router } from "express";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  searchMemories,
  updateMemory,
} from "../controllers/memoryController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const memoryRouter = Router();

memoryRouter.use(requireAuth);

memoryRouter.get("/", listMemories);
memoryRouter.get("/search", searchMemories);
memoryRouter.post("/", createMemory);
memoryRouter.get("/:memoryId", getMemory);
memoryRouter.patch("/:memoryId", updateMemory);
memoryRouter.delete("/:memoryId", deleteMemory);
