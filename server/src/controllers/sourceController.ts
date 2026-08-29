import type { Request, Response } from "express";
import { ValidationError } from "../types/errors.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
  bulkDeleteSourcesSchema,
  createSourceSchema,
  importWebsiteSchema,
  importYoutubeSchema,
  listSourcesQuerySchema,
  sourceIdParamSchema,
} from "../validators/sourceValidator.js";
import { workspaceIdParamSchema } from "../validators/workspaceValidator.js";
import {
  bulkDeleteSourcesForWorkspace,
  createSourceRecord,
  deleteSourceForWorkspace,
  getSourceForWorkspace,
  listSourcesForWorkspace,
  updateSourceRecord,
} from "../services/sourceService.js";
import { getWorkspaceByIdForUser } from "../services/workspaceService.js";
import { removeSourceFromIndex } from "./sourceChunkController.js";
import { scrapeWebsite } from "../lib/firecrawl.js";
import { uploadPdfToCloudinary } from "../lib/cloudinary.js";
import { extractPdfFromBuffer } from "../lib/pdf.js";
import { fetchYoutubeTranscript } from "../lib/youtube.js";
import { parseWorkspaceId } from "./workspaceController.js";
import { enqueueSourceProcessing } from "../lib/sourceEvents.js";

function parseSourceParams(params: Request["params"]) {
  const parsed = sourceIdParamSchema.safeParse(params);

  if (!parsed.success) {
    throw new ValidationError(
      "Invalid source id",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseListQuery(query: Request["query"]) {
  const parsed = listSourcesQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new ValidationError(
      "Invalid query parameters",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseCreateBody(body: unknown) {
  const parsed = createSourceSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseBulkDeleteBody(body: unknown) {
  const parsed = bulkDeleteSourcesSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

async function createAndProcessSource(
  data: Parameters<typeof createSourceRecord>[0],
) {
  const source = await createSourceRecord(data);

  await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId: source.workspaceId,
  });

  return source;
}

export async function listSources(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const filters = parseListQuery(req.query);
  const sources = await listSourcesForWorkspace(
    workspaceId,
    req.session.user.id,
    filters,
  );
  res.json(sources);
}

export async function getSource(req: Request, res: Response) {
  const { workspaceId, sourceId } = parseSourceParams(req.params);
  const source = await getSourceForWorkspace(
    workspaceId,
    sourceId,
    req.session.user.id,
  );
  res.json(source);
}

export async function createTextOrMarkdownSource(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseCreateBody(req.body);

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const source = await createAndProcessSource({
    workspaceId,
    type: input.type,
    title: input.title,
    content: input.content,
    status: "PENDING",
  });

  res.status(201).json(source);
}

export async function deleteSource(req: Request, res: Response) {
  const { workspaceId, sourceId } = parseSourceParams(req.params);
  await deleteSourceForWorkspace(workspaceId, sourceId, req.session.user.id);
  res.status(204).send();
}

export async function bulkDeleteSources(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseBulkDeleteBody(req.body);
  await bulkDeleteSourcesForWorkspace(
    workspaceId,
    req.session.user.id,
    input.sourceIds,
  );
  res.status(204).send();
}

export async function uploadPdf(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);

  if (!req.file) {
    throw new ValidationError("PDF file is required");
  }

  const title = typeof req.body.title === "string" ? req.body.title : undefined;

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const upload = await uploadPdfToCloudinary(
    req.file.buffer,
    req.file.originalname,
  );

  let content: string | null = null;
  let pageCount: number | undefined;
  let pages: string[] | undefined;

  try {
    const extracted = await extractPdfFromBuffer(req.file.buffer);
    content = extracted.text;
    pageCount = extracted.pageCount;
    // Persist per-page text so the processing worker can chunk page-aware
    // without re-downloading from Cloudinary (raw PDF delivery is blocked by
    // default on standard Cloudinary accounts).
    pages = extracted.pages;
  } catch {
    // Inngest will retry extraction from Cloudinary if upload-time parse fails.
  }

  const source = await createAndProcessSource({
    workspaceId,
    type: "PDF",
    title: title?.trim() || req.file.originalname.replace(/\.pdf$/i, ""),
    content,
    status: "PENDING",
    metadata: {
      fileUrl: upload.secureUrl,
      fileName: upload.originalFilename,
      fileSize: upload.bytes,
      publicId: upload.publicId,
      resourceType: upload.resourceType,
      pageCount,
      ...(pages ? { pages } : {}),
    },
  });

  res.status(201).json(source);
}

export async function importWebsite(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);
  const input = importWebsiteSchema.parse(req.body);

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const scraped = await scrapeWebsite(input.url);

  const source = await createAndProcessSource({
    workspaceId,
    type: "WEBSITE",
    title: input.title || scraped.title || input.url,
    content: scraped.markdown,
    url: scraped.sourceUrl,
    status: "PENDING",
    metadata: {
      importedFrom: scraped.sourceUrl,
    },
  });

  res.status(201).json(source);
}

export async function importYoutube(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);
  const input = importYoutubeSchema.parse(req.body);

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const transcript = await fetchYoutubeTranscript(input.url);

  const source = await createAndProcessSource({
    workspaceId,
    type: "YOUTUBE",
    title: input.title || `YouTube: ${transcript.videoId}`,
    content: transcript.content,
    url: input.url,
    status: "PENDING",
    metadata: {
      videoId: transcript.videoId,
    },
  });

  res.status(201).json(source);
}

/**
 * Re-runs processing for a source stuck in FAILED/PENDING.
 *
 * Cleans up partial output from the previous attempt first (Pinecone vectors
 * plus DB chunk rows) so re-indexing cannot leave duplicates behind, clears
 * the recorded error, and enqueues a fresh pipeline run.
 *
 * @throws {NotFoundError} When the source does not exist in this workspace
 * @throws {ValidationError} When the source is READY or already PROCESSING
 */
export async function retrySource(req: Request, res: Response) {
  const { workspaceId, sourceId } = parseSourceParams(req.params);
  const source = await getSourceForWorkspace(
    workspaceId,
    sourceId,
    req.session.user.id,
  );

  if (source.status === "PROCESSING") {
    throw new ValidationError("Source is already being processed");
  }

  if (source.status === "READY") {
    throw new ValidationError("Source is already processed and ready");
  }

  // Remove any partial output from a failed attempt so vectors don't pile up.
  await removeSourceFromIndex(workspaceId, sourceId);

  const metadata =
    source.metadata &&
    typeof source.metadata === "object" &&
    !Array.isArray(source.metadata)
      ? (source.metadata as Record<string, unknown>)
      : {};

  const reset = await updateSourceRecord(sourceId, {
    status: "PENDING",
    metadata: {
      ...metadata,
      processingError: undefined,
    },
  });

  await enqueueSourceProcessing({
    sourceId,
    workspaceId,
  });

  res.json(reset);
}
