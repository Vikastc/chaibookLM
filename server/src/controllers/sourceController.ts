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
} from "../services/sourceService.js";
import { getWorkspaceByIdForUser } from "../services/workspaceService.js";
import { scrapeWebsite } from "../lib/firecrawl.js";
import { uploadPdfToCloudinary } from "../lib/cloudinary.js";
import { extractPdfFromBuffer } from "../lib/pdf.js";
import { fetchYoutubeTranscript } from "../lib/youtube.js";
import { parseWorkspaceId } from "./workspaceController.js";

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

export async function createSource(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseCreateBody(req.body);

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const source = await createSourceRecord({
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

  try {
    const extracted = await extractPdfFromBuffer(req.file.buffer);
    content = extracted.text;
    pageCount = extracted.pageCount;
  } catch {
    // Inngest will retry extraction from Cloudinary if upload-time parse fails.
  }

  const source = await createSourceRecord({
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
    },
  });

  res.status(201).json(source);
}

export async function importWebsite(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);
  const input = importWebsiteSchema.parse(req.body);

  await getWorkspaceByIdForUser(workspaceId, req.session.user.id);

  const scraped = await scrapeWebsite(input.url);

  const source = await createSourceRecord({
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

  const source = await createSourceRecord({
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
