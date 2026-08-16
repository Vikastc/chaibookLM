import { prisma } from "../lib/db.js";
import { deleteWorkspaceVectors } from "../lib/pinecone.js";
import { NotFoundError } from "../types/errors.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../validators/workspaceValidator.js";

export const workspaceSelect = {
  id: true,
  title: true,
  description: true,
  icon: true,
  defaultModel: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type WorkspaceRecord = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function listWorkspacesByUser(userId: string) {
  return prisma.workspace.findMany({
    where: { userId },
    select: workspaceSelect,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkspaceByIdForUser(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRecord> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: workspaceSelect,
  });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  return workspace;
}

export function createWorkspaceForUser(
  userId: string,
  input: CreateWorkspaceInput,
) {
  return prisma.workspace.create({
    data: {
      userId,
      ...input,
    },
    select: workspaceSelect,
  });
}

export async function updateWorkspaceForUser(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: input,
    select: workspaceSelect,
  });
}

export async function deleteWorkspaceForUser(
  workspaceId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  try {
    await deleteWorkspaceVectors(workspaceId);
  } catch (error) {
    console.error("Failed to delete Pinecone namespace:", error);
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });
}
