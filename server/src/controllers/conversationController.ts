import type { Request, Response } from "express";
import { pipeUIMessageStreamToResponse, type UIMessage } from "ai";
import {
  createConversationForWorkspace,
  deleteConversationForWorkspace,
  getConversationMessagesForWorkspace,
  listConversationsForWorkspace,
  streamWorkspaceConversation,
} from "../services/conversationService.js";
import { ValidationError } from "../types/errors.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
  conversationIdParamSchema,
  createConversationSchema,
  sendMessageSchema,
} from "../validators/conversationValidator.js";
import { parseWorkspaceId } from "./workspaceController.js";

function parseConversationParams(params: Request["params"]) {
  const parsed = conversationIdParamSchema.safeParse(params);

  if (!parsed.success) {
    throw new ValidationError(
      "Invalid conversation id",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseCreateBody(body: unknown) {
  const parsed = createConversationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseSendMessageBody(body: unknown) {
  const parsed = sendMessageSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

export async function listConversations(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const conversations = await listConversationsForWorkspace(
    workspaceId,
    req.session.user.id,
  );
  res.json(conversations);
}

export async function createConversation(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseCreateBody(req.body);
  const conversation = await createConversationForWorkspace(
    workspaceId,
    req.session.user.id,
    input.title,
  );
  res.status(201).json(conversation);
}

export async function listConversationMessages(req: Request, res: Response) {
  const { workspaceId, conversationId } = parseConversationParams(req.params);
  const messages = await getConversationMessagesForWorkspace(
    workspaceId,
    conversationId,
    req.session.user.id,
  );
  res.json(messages);
}

export async function deleteConversation(req: Request, res: Response) {
  const { workspaceId, conversationId } = parseConversationParams(req.params);
  await deleteConversationForWorkspace(
    workspaceId,
    conversationId,
    req.session.user.id,
  );
  res.status(204).send();
}

export async function streamConversation(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const body = parseSendMessageBody(req.body);

  const { conversationId, stream } = await streamWorkspaceConversation(
    workspaceId,
    req.session.user.id,
    {
      conversationId: body.conversationId,
      messages: body.messages as unknown as UIMessage[],
      model: body.model,
      webSearch: body.webSearch,
    },
  );

  await pipeUIMessageStreamToResponse({
    response: res,
    stream,
    headers: {
      "X-Conversation-Id": conversationId,
    },
  });
}
