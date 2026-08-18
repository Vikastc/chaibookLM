import { z } from "zod";

export const memoryIdParamSchema = z.object({
  memoryId: z.string().trim().min(1, "Memory id is required"),
});

export const createMemorySchema = z.object({
  memory: z.string().trim().min(1, "Memory text is required").max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMemorySchema = z.object({
  memory: z.string().trim().min(1, "Memory text is required").max(2000),
});

export const searchMemoriesQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
