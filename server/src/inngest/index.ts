import { findChunksBySourceId } from "../services/sourceChunkService.js";
import {
  findSourceById,
  findStaleUnprocessedSources,
} from "../services/sourceService.js";
import {
  findStaleUnfinishedArtifacts,
  reapSingleArtifact,
} from "../services/artifactService.js";
import { processArtifactById } from "../services/artifactService.js";
import { summarizeConversationById } from "../controllers/conversationMemController.js";

import {
  chunkSourceContent,
  embedAndIndexSource,
  extractSourceContent,
  markSourceFailed,
  markSourceProcessing,
} from "../controllers/sourceChunkController.js";
import { inngest } from "./client.js";
import { STALE_PROCESSING_MINUTES } from "../lib/aiConfig.js";

export const processSource = inngest.createFunction(
  {
    id: "process-source",
    retries: 3,
    triggers: [{ event: "source/created" }],
  },
  async ({ event, step }) => {
    const { sourceId } = event.data;

    await step.run("mark-processing", () => markSourceProcessing(sourceId));

    try {
      const extracted = await step.run("extract-content", () =>
        extractSourceContent(sourceId),
      );

      await step.run("chunk-content", () =>
        chunkSourceContent(sourceId, extracted.text, extracted.pages),
      );

      const result = await step.run("embed-and-index", async () => {
        const source = await findSourceById(sourceId);
        if (!source) {
          throw new Error("Source not found");
        }

        const chunks = await findChunksBySourceId(sourceId);
        await embedAndIndexSource(source, chunks);

        return { chunkCount: chunks.length };
      });

      return { sourceId, status: "READY", ...result };
    } catch (error) {
      await step.run("mark-failed", async () => {
        const source = await findSourceById(sourceId);
        if (source) {
          await markSourceFailed(sourceId, error, source.metadata);
        }
      });
      throw error;
    }
  },
);

export const summarizeConversation = inngest.createFunction(
  {
    id: "summarize-conversation",
    retries: 2,
    triggers: [{ event: "conversation/summarize" }],
  },
  async ({ event, step }) => {
    const { conversationId, userId } = event.data;

    await step.run("summarize", () =>
      summarizeConversationById(conversationId, userId),
    );

    return { conversationId, status: "SUMMARIZED" };
  },
);

export const generateArtifact = inngest.createFunction(
  {
    id: "generate-artifact",
    retries: 2,
    triggers: [{ event: "artifact/generate" }],
  },
  async ({ event, step }) => {
    const { artifactId } = event.data;

    await step.run("generate", () => processArtifactById(artifactId));

    return { artifactId, status: "READY" };
  },
);

/**
 * Transitions a single stuck source to FAILED so the UI surfaces it as
 * retryable instead of showing an endless PROCESSING spinner.
 *
 * Re-checks the status inside the step because the source may legitimately
 * have finished between the discovery query and this step running.
 *
 * @param sourceId - Source to reap
 * @returns true when the source was transitioned to FAILED, false if it was
 * already terminal (READY/FAILED) or deleted in the meantime
 *
 */
async function reapSingleSource(sourceId: string): Promise<boolean> {
  const source = await findSourceById(sourceId);

  if (
    !source ||
    (source.status !== "PENDING" && source.status !== "PROCESSING")
  ) {
    return false;
  }

  await markSourceFailed(
    sourceId,
    new Error(
      `Processing did not finish within ${STALE_PROCESSING_MINUTES} minutes — the worker may have been restarted. Retry processing from the sources panel.`,
    ),
    source.metadata,
  );

  return true;
}

/**
 * Cron job: marks long-stuck PENDING/PROCESSING sources and artifacts as FAILED.
 *
 * Inngest retries step failures but cannot survive an event lost while the
 * Express server was down — such jobs would spin forever. Anything unchanged
 * for STALE_PROCESSING_MINUTES is reaped.
 */
export const reapStaleSources = inngest.createFunction(
  {
    id: "reap-stale-sources",
    retries: 0,
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const staleBefore = new Date(
      Date.now() - STALE_PROCESSING_MINUTES * 60_000,
    );
    const reapedIds: string[] = [];

    const staleSources = await step.run("find-stale-sources", () =>
      findStaleUnprocessedSources(staleBefore),
    );

    for (const source of staleSources) {
      const wasReaped = await step.run(`mark-failed-${source.id}`, () =>
        reapSingleSource(source.id),
      );
      if (wasReaped) {
        reapedIds.push(source.id);
      }
    }

    // Artifacts share the same failure mode (worker restart mid-generation),
    // so they get the same treatment in the same cron run.
    const staleArtifacts = await step.run("find-stale-artifacts", () =>
      findStaleUnfinishedArtifacts(staleBefore),
    );

    for (const artifact of staleArtifacts) {
      const wasReaped = await step.run(
        `mark-artifact-failed-${artifact.id}`,
        () => reapSingleArtifact(artifact.id),
      );
      if (wasReaped) {
        reapedIds.push(artifact.id);
      }
    }

    return { reapedCount: reapedIds.length, ids: reapedIds };
  },
);

export const functions = [
  processSource,
  summarizeConversation,
  generateArtifact,
  reapStaleSources,
];
