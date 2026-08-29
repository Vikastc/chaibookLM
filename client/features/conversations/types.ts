/** Mirrors ConversationRecord from server/src/services/conversationService.ts. */
export type Conversation = {
  id: string
  workspaceId: string
  title: string | null
  summary: string | null
  summaryMessageCount: number
  summarizedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Citation stored on persisted assistant messages (Prisma JSON column).
 * Shape depends on the citation kind: workspace sources carry `sourceId`,
 * web results carry `url`.
 */
export type MessageCitation = {
  sourceId?: string
  sourceType: string
  sourceTitle?: string
  url?: string
  excerpt?: string
  page?: number
}

/** Mirrors MessageRecord from server/src/services/messageService.ts. */
export type ConversationMessage = {
  id: string
  conversationId: string
  role: "USER" | "ASSISTANT"
  content: string
  citations: MessageCitation[] | null
  createdAt: string
}