/** Mirrors server/src/validators/sourceValidator.ts and the Source model. */
export const SOURCE_TYPES = [
  "PDF",
  "WEBSITE",
  "YOUTUBE",
  "TEXT",
  "MARKDOWN",
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export type SourceStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED"

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  PDF: "PDF",
  WEBSITE: "Website",
  YOUTUBE: "YouTube",
  TEXT: "Text",
  MARKDOWN: "Markdown",
}

export type SourceMetadata = {
  fileUrl?: string
  fileName?: string
  fileSize?: number
  pageCount?: number
  videoId?: string
  importedFrom?: string
  [key: string]: unknown
}

export type Source = {
  id: string
  workspaceId: string
  type: SourceType
  title: string
  content: string | null
  url: string | null
  status: SourceStatus
  metadata: SourceMetadata | null
  createdAt: string
  updatedAt: string
}

export type CreateTextSourceInput = {
  type: "TEXT" | "MARKDOWN"
  title: string
  content: string
}

export type ImportUrlInput = {
  url: string
  title?: string
}
