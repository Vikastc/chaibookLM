/** Mirrors server/src/validators/artifactValidator.ts and the LearningArtifact model. */
export const ARTIFACT_TYPES = [
  "SUMMARY",
  "TAKEAWAYS",
  "FLASHCARDS",
  "QUIZ",
  "MINDMAP",
  "REPORT",
] as const
export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

export type ArtifactStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED"

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  SUMMARY: "Summary",
  TAKEAWAYS: "Key takeaways",
  FLASHCARDS: "Flashcards",
  QUIZ: "Quiz",
  MINDMAP: "Mind map",
  REPORT: "Report",
}

/** Per-type generated content stored on the artifact row (Prisma JSON column). */
export type SummaryContent = { markdown: string }
export type TakeawaysContent = { items: string[] }
export type FlashcardsContent = { cards: { front: string; back: string }[] }
export type QuizContent = {
  questions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]
}
export type MindmapContent = {
  nodes: { id: string; label: string }[]
  edges: { source: string; target: string }[]
}
export type ReportContent = {
  markdown: string
  sections: { title: string; content: string }[]
}

export type ArtifactMetadata = {
  generatedAt?: string
  processingError?: string
  [key: string]: unknown
}

export type Artifact = {
  id: string
  workspaceId: string
  type: ArtifactType
  title: string
  content: Record<string, unknown> | null
  sourceIds: string[]
  status: ArtifactStatus
  metadata: ArtifactMetadata | null
  createdAt: string
  updatedAt: string
}

export type CreateArtifactInput = {
  type: ArtifactType
  title?: string
  sourceIds?: string[]
}