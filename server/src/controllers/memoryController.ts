import type { Request, Response } from "express";
import {
  createMemoryForUser,
  deleteMemoryForUser,
  getMemoryByIdForUser,
  listMemoriesForUser,
  searchMemoriesForUser,
  updateMemoryForUser,
} from "../services/memoryService.js";
import { ValidationError } from "../types/errors.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
  createMemorySchema,
  memoryIdParamSchema,
  searchMemoriesQuerySchema,
  updateMemorySchema,
} from "../validators/memoryValidator.js";

function parseMemoryId(params: Request["params"]) {
  const parsed = memoryIdParamSchema.safeParse(params);

  if (!parsed.success) {
    throw new ValidationError(
      "Invalid memory id",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseCreateBody(body: unknown) {
  const parsed = createMemorySchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseUpdateBody(body: unknown) {
  const parsed = updateMemorySchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseSearchQuery(query: Request["query"]) {
  const parsed = searchMemoriesQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

export async function listMemories(req: Request, res: Response) {
  const memories = await listMemoriesForUser(req.session.user.id);
  res.json(memories);
}

export async function searchMemories(req: Request, res: Response) {
  const { q } = parseSearchQuery(req.query);
  const memories = await searchMemoriesForUser(req.session.user.id, q);
  res.json(memories);
}

export async function getMemory(req: Request, res: Response) {
  const { memoryId } = parseMemoryId(req.params);
  const memory = await getMemoryByIdForUser(memoryId, req.session.user.id);
  res.json(memory);
}

export async function createMemory(req: Request, res: Response) {
  const input = parseCreateBody(req.body);
  const memory = await createMemoryForUser(req.session.user.id, input);
  res.status(201).json(memory);
}

export async function updateMemory(req: Request, res: Response) {
  const { memoryId } = parseMemoryId(req.params);
  const input = parseUpdateBody(req.body);
  const memory = await updateMemoryForUser(
    memoryId,
    req.session.user.id,
    input,
  );
  res.json(memory);
}

export async function deleteMemory(req: Request, res: Response) {
  const { memoryId } = parseMemoryId(req.params);
  await deleteMemoryForUser(memoryId, req.session.user.id);
  res.status(204).send();
}
