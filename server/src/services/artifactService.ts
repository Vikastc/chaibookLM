import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";
import { enqueueArtifactGeneration } from "../lib/artifactEvents.js";
import {
  gatherSourceContext,
  generateArtifactContent,
} from "../controllers/artifactGenerate.js";
import { NotFoundError } from "../types/errors.js";
import type { CreateArtifactInput } from "../validators/artifactValidator.js";
import { getWorkspaceByIdForUser } from "./workspaceService.js";

export const artifactSelect = {
  id: true,
  workspaceId: true,
  type: true,
  title: true,
  content: true,
  sourceIds: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ArtifactRecord = Prisma.LearningArtifactGetPayload<{
  select: typeof artifactSelect;
}>;

export type CreateArtifactData = {
  workspaceId: string;
  type: ArtifactRecord["type"];
  title: string;
  sourceIds: string[];
  status?: ArtifactRecord["status"];
  metadata?: Prisma.InputJsonValue;
};

export function findArtifactsByWorkspaceId(workspaceId: string) {
  return prisma.learningArtifact.findMany({
    where: { workspaceId },
    select: artifactSelect,
    orderBy: { createdAt: "desc" },
  });
}

export function findArtifactByIdAndWorkspaceId(
  artifactId: string,
  workspaceId: string,
) {
  return prisma.learningArtifact.findFirst({
    where: { id: artifactId, workspaceId },
    select: artifactSelect,
  });
}

export function createArtifactRecord(data: CreateArtifactData) {
  return prisma.learningArtifact.create({
    data: {
      workspaceId: data.workspaceId,
      type: data.type,
      title: data.title,
      sourceIds: data.sourceIds,
      status: data.status ?? "PENDING",
      metadata: data.metadata,
    },
    select: artifactSelect,
  });
}

export function updateArtifactRecord(
  artifactId: string,
  data: {
    title?: string;
    content?: Prisma.InputJsonValue;
    status?: ArtifactRecord["status"];
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.learningArtifact.update({
    where: { id: artifactId },
    data,
    select: artifactSelect,
  });
}

export async function deleteArtifactRecord(artifactId: string) {
  await prisma.learningArtifact.delete({
    where: { id: artifactId },
  });
}

export function findArtifactById(artifactId: string) {
  return prisma.learningArtifact.findUnique({
    where: { id: artifactId },
    select: artifactSelect,
  });
}

/**
 * Finds artifacts still queued/processing whose last update is older than the
 * given cutoff — i.e. generation jobs lost to a worker restart.
 *
 * Used by the Inngest `reap-stale-sources` cron function; internal pipelines
 * only, so no ownership check.
 *
 * @param staleBefore - Timestamp; anything not updated after this is returned
 * @returns Up to 50 oldest stale artifacts with minimal fields
 *
 */
export function findStaleUnfinishedArtifacts(staleBefore: Date) {
  return prisma.learningArtifact.findMany({
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

/**
 * Transitions a single stuck artifact to FAILED so the UI surfaces it as
 * deletable/regenerable instead of showing an endless spinner.
 *
 * Re-checks the status first: the artifact may have legitimately finished
 * between the discovery query and this step running.
 *
 * @param artifactId - Artifact to reap
 * @returns true when the artifact was transitioned to FAILED
 *
 */
export async function reapSingleArtifact(artifactId: string): Promise<boolean> {
  const artifact = await findArtifactById(artifactId);
  if (
    !artifact ||
    (artifact.status !== "PENDING" && artifact.status !== "PROCESSING")
  ) {
    return false;
  }

  const metadata =
    artifact.metadata &&
    typeof artifact.metadata === "object" &&
    !Array.isArray(artifact.metadata)
      ? (artifact.metadata as Record<string, unknown>)
      : {};

  await updateArtifactRecord(artifactId, {
    status: "FAILED",
    metadata: {
      ...metadata,
      processingError: `Generation did not finish within the expected time — the worker may have been restarted. Delete this artifact and generate it again.`,
    },
  });

  return true;
}

/**
 * Lists all learning artifacts in a workspace.
 *
 * @param workspaceId - Workspace to list artifacts from
 * @param userId - Authenticated user's id
 * @returns Artifact records ordered by creation time
 *
 */
export async function listArtifactsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);
  return findArtifactsByWorkspaceId(workspaceId);
}

/**
 * Loads a single artifact after verifying workspace ownership.
 *
 * @param workspaceId - Workspace the artifact belongs to
 * @param artifactId - Artifact to fetch
 * @param userId - Authenticated user's id
 * @returns Artifact record with content when status is `READY`
 * @throws {NotFoundError} When the artifact does not exist in this workspace
 *
 */
export async function getArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const artifact = await findArtifactByIdAndWorkspaceId(
    artifactId,
    workspaceId,
  );

  if (!artifact) {
    throw new NotFoundError("Artifact not found");
  }

  return artifact;
}

/**
 * Creates a pending artifact and enqueues background generation via Inngest.
 *
 * Validates that ready sources exist before creating the row. The actual AI
 * generation runs asynchronously in {@link processArtifactById}.
 *
 * @param workspaceId - Workspace to attach the artifact to
 * @param userId - Authenticated user's id
 * @param input - Artifact type, optional title, optional source id filter
 * @returns New artifact with status `PENDING`
 * @throws {ValidationError} When no ready sources are available
 *
 */
export async function createArtifactForWorkspace(
  workspaceId: string,
  userId: string,
  input: CreateArtifactInput,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const context = await gatherSourceContext(workspaceId, input.sourceIds);

  const artifact = await createArtifactRecord({
    workspaceId,
    type: input.type,
    title:
      input.title ||
      `${
        {
          SUMMARY: "Summary",
          TAKEAWAYS: "Key Takeaways",
          FLASHCARDS: "Flashcards",
          QUIZ: "Quiz",
          MINDMAP: "Mind Map",
          REPORT: "AI Report",
        }[input.type]
      } · ${new Date().toLocaleDateString()}`,
    sourceIds: context.sourceIds,
    status: "PENDING",
  });

  await enqueueArtifactGeneration({
    artifactId: artifact.id,
    workspaceId,
    userId,
  });

  return artifact;
}

/**
 * Deletes an artifact from the workspace.
 *
 * @param workspaceId - Workspace the artifact belongs to
 * @param artifactId - Artifact to delete
 * @param userId - Authenticated user's id
 * @returns Resolves when the artifact row is deleted
 * @throws {NotFoundError} When the artifact is not found
 *
 */
export async function deleteArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  await getArtifactForWorkspace(workspaceId, artifactId, userId);
  await deleteArtifactRecord(artifactId);
}

/**
 * Runs the full artifact generation pipeline (used by Inngest worker).
 *
 * ```
 * status: PROCESSING
 *   → gatherSourceContext
 *   → generateArtifactContent
 *   → status: READY (or FAILED on error)
 * ```
 *
 * @param artifactId - Artifact to generate content for
 * @param userId - Owner of the artifact (used for token quota enforcement)
 * @returns Updated artifact with `READY` status and generated content
 * @throws When the artifact is missing or generation fails (status set to `FAILED`)
 *
 *
 */
export async function processArtifactById(artifactId: string, userId: string) {
  const artifact = await findArtifactById(artifactId);
  if (!artifact) {
    throw new Error("Artifact not found");
  }

  await updateArtifactRecord(artifactId, { status: "PROCESSING" });

  try {
    const context = await gatherSourceContext(
      artifact.workspaceId,
      artifact.sourceIds,
    );

    const content = await generateArtifactContent(artifact.type, context.text, userId);

    return updateArtifactRecord(artifactId, {
      status: "READY",
      content: content as Prisma.InputJsonValue,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingError: undefined,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Artifact generation failed";

    await updateArtifactRecord(artifactId, {
      status: "FAILED",
      metadata: {
        processingError: message,
      },
    });

    throw error;
  }
}
