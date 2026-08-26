import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  listConversationMessages,
  listConversations,
  streamConversation,
} from "../controllers/conversationController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const conversationRouter = Router({ mergeParams: true });

conversationRouter.use(requireAuth);

conversationRouter.get("/", listConversations);
conversationRouter.post("/", createConversation);
conversationRouter.post("/messages", streamConversation);
conversationRouter.get("/:conversationId/messages", listConversationMessages);
conversationRouter.delete("/:conversationId", deleteConversation);