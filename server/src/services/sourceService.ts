import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";

// import { uploadPdfToCloudinary } from "../lib/cloudinary.js";
// import { scrapeWebsite } from "../lib/firecrawl.js";
// import { extractPdfFromBuffer } from "../lib/pdf.js";
// import { enqueueSourceProcessing } from "../lib/source-events.js";
// import { fetchYoutubeTranscript } from "../lib/youtube.js";

import { NotFoundError } from "../types/errors.js";
import {
  CreateSourceInput,
  ImportWebsiteInput,
  ImportYoutubeInput,
} from "../validators/sourceValidator.js";
import { getWorkspaceByIdForUser } from "./workspaceService.js";
import { ListSourcesQuery } from "../validators/sourceValidator.js";

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

export type CreateSourceData = {
  workspaceId: string;
  type: SourceRecord["type"];
  title: string;
  content?: string | null;
  url?: string | null;
  status?: SourceRecord["status"];
  metadata?: Prisma.InputJsonValue;
};

export type SourceRecord = Prisma.SourceGetPayload<{
  select: typeof sourceSelect;
}>;

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

export function findSourceById(sourceId: string) {
  return prisma.source.findUnique({
    where: { id: sourceId },
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

async function createAndProcessSource(
  data: Parameters<typeof createSourceRecord>[0],
) {
  const source = await createSourceRecord(data); //

  //   await enqueueSourceProcessing({
  //     sourceId: source.id,
  //     workspaceId: source.workspaceId,
  //   });

  return source;
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

// export async function createTextOrMarkdownSource(
//   workspaceId: string,
//   userId: string,
//   input: CreateSourceInput,
// ) {
//   await getWorkspaceByIdForUser(workspaceId, userId);

//   return createAndProcessSource({
//     workspaceId,
//     type: input.type,
//     title: input.title,
//     content: input.content,
//     status: "PENDING",
//   });
// }

// export async function importWebsiteSource(
//   workspaceId: string,
//   userId: string,
//   input: ImportWebsiteInput,
// ) {
//   await getWorkspaceByIdForUser(workspaceId, userId);

//   const scraped = await scrapeWebsite(input.url);

//   return createAndProcessSource({
//     workspaceId,
//     type: "WEBSITE",
//     title: input.title || scraped.title || input.url,
//     content: scraped.markdown,
//     url: scraped.sourceUrl,
//     status: "PENDING",
//     metadata: {
//       importedFrom: scraped.sourceUrl,
//     },
//   });
// }

// export async function uploadPdfSource(
//   workspaceId: string,
//   userId: string,
//   file: Express.Multer.File,
//   title?: string,
// ) {
//   await getWorkspaceByIdForUser(workspaceId, userId);

//   const upload = await uploadPdfToCloudinary(file.buffer, file.originalname);

//   let content: string | null = null;
//   let pageCount: number | undefined;

//   try {
//     const extracted = await extractPdfFromBuffer(file.buffer);
//     content = extracted.text;
//     pageCount = extracted.pageCount;
//   } catch {
//     // Inngest will retry extraction from Cloudinary if upload-time parse fails.
//   }

//   return createAndProcessSource({
//     workspaceId,
//     type: "PDF",
//     title: title?.trim() || file.originalname.replace(/\.pdf$/i, ""),
//     content,
//     status: "PENDING",
//     metadata: {
//       fileUrl: upload.secureUrl,
//       fileName: upload.originalFilename,
//       fileSize: upload.bytes,
//       publicId: upload.publicId,
//       resourceType: upload.resourceType,
//       pageCount,
//     },
//   });
// }

// export async function importYoutubeSource(
//   workspaceId: string,
//   userId: string,
//   input: ImportYoutubeInput,
// ) {
//   await getWorkspaceByIdForUser(workspaceId, userId);

//   const transcript = await fetchYoutubeTranscript(input.url);

//   return createAndProcessSource({
//     workspaceId,
//     type: "YOUTUBE",
//     title: input.title || `YouTube: ${transcript.videoId}`,
//     content: transcript.content,
//     url: input.url,
//     status: "PENDING",
//     metadata: {
//       videoId: transcript.videoId,
//     },
//   });
// }
