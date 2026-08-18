import {
  addUserMemory,
  deleteUserMemory,
  getUserMemoryById,
  listUserMemories,
  searchUserMemories,
  updateUserMemory,
} from "../lib/mem0.js";
import { NotFoundError } from "../types/errors.js";
import type {
  CreateMemoryInput,
  UpdateMemoryInput,
} from "../validators/memoryValidator.js";

export function listMemoriesForUser(userId: string) {
  return listUserMemories(userId);
}

export function searchMemoriesForUser(userId: string, query: string) {
  return searchUserMemories(userId, query);
}

export async function getMemoryByIdForUser(memoryId: string, userId: string) {
  const memory = await getUserMemoryById(memoryId, userId);

  if (!memory) {
    throw new NotFoundError("Memory not found");
  }

  return memory;
}

export function createMemoryForUser(userId: string, input: CreateMemoryInput) {
  return addUserMemory(userId, {
    memory: input.memory,
    metadata: { ...input.metadata, source: "manual" },
  });
}

export async function updateMemoryForUser(
  memoryId: string,
  userId: string,
  input: UpdateMemoryInput,
) {
  await getMemoryByIdForUser(memoryId, userId);

  return updateUserMemory(memoryId, input);
}

export async function deleteMemoryForUser(memoryId: string, userId: string) {
  await getMemoryByIdForUser(memoryId, userId);

  await deleteUserMemory(memoryId);
}
