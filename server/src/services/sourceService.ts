import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";

import { NotFoundError } from "../types/errors.js";
import { ListSourcesQuery } from "../validators/sourceValidator.js";
import { getWorkspaceByIdForUser } from "./workspaceService.js";

export const sourceSelect = {
  id: true,
  workspaceId: true,
  type: true,
  title: true,
  content: true,
  url: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SourceRecord = Prisma.SourceGetPayload<{
  select: typeof sourceSelect;
}>;

export type CreateSourceData = {
  workspaceId: string;
  type: SourceRecord["type"];
  title: string;
  content?: string | null;
  url?: string | null;
  status?: SourceRecord["status"];
  metadata?: Prisma.InputJsonValue;
};

export function findSourceById(sourceId: string) {
  return prisma.source.findUnique({
    where: { id: sourceId },
    select: sourceSelect,
  });
}

export function createSourceRecord(data: CreateSourceData) {
  return prisma.source.create({
    data: {
      workspaceId: data.workspaceId,
      type: data.type,
      title: data.title,
      content: data.content ?? null,
      url: data.url ?? null,
      status: data.status ?? "PENDING",
      metadata: data.metadata,
    },
    select: sourceSelect,
  });
}

export function updateSourceRecord(
  sourceId: string,
  data: {
    content?: string | null;
    status?: SourceRecord["status"];
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.source.update({
    where: { id: sourceId },
    data,
    select: sourceSelect,
  });
}

export async function listSourcesForWorkspace(
  workspaceId: string,
  userId: string,
  filters: ListSourcesQuery = {},
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const where: Prisma.SourceWhereInput = { workspaceId };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { content: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return prisma.source.findMany({
    where,
    select: sourceSelect,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Lists READY sources for a workspace without an ownership check.
 *
 * Used by internal pipelines (e.g. artifact generation, Inngest workers) where
 * workspace ownership has already been verified by the caller.
 */
export function findReadySourcesByWorkspaceId(workspaceId: string) {
  return prisma.source.findMany({
    where: { workspaceId, status: "READY" },
    select: sourceSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getSourceForWorkspace(
  workspaceId: string,
  sourceId: string,
  userId: string,
): Promise<SourceRecord> {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const source = await prisma.source.findFirst({
    where: { id: sourceId, workspaceId },
    select: sourceSelect,
  });

  if (!source) {
    throw new NotFoundError("Source not found");
  }

  return source;
}

export async function deleteSourceForWorkspace(
  workspaceId: string,
  sourceId: string,
  userId: string,
) {
  await getSourceForWorkspace(workspaceId, sourceId, userId);

  await prisma.source.delete({
    where: { id: sourceId },
  });
}

export async function bulkDeleteSourcesForWorkspace(
  workspaceId: string,
  userId: string,
  sourceIds: string[],
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  for (const sourceId of sourceIds) {
    await deleteSourceForWorkspace(workspaceId, sourceId, userId);
  }
}

/**
 * Finds sources still queued/processing whose last update is older than the
 * given cutoff — i.e. events that were probably lost to a worker restart.
 *
 * Used by the Inngest `reap-stale-sources` cron function; internal pipelines
 * only, so no ownership check like the other *ForWorkspace helpers.
 *
 * @param staleBefore - Timestamp; anything not updated after this is returned
 * @returns Up to 50 oldest stale sources with minimal fields
 *
 */
export function findStaleUnprocessedSources(staleBefore: Date) {
  return prisma.source.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      updatedAt: { lt: staleBefore },
    },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      status: true,
      metadata: true,
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
  });
}

