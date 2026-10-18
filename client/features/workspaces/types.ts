/** Mirrors the server's CHAT_MODELS (server/src/validators/workspaceValidator.ts). */
export const CHAT_MODELS = ["claude-haiku-5-5", "claude-sonnet-4-20250514"] as const
export type ChatModel = (typeof CHAT_MODELS)[number]

export const CHAT_MODEL_LABELS: Record<ChatModel, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-4-20250514": "Claude Sonnet",
}

/** Mirrors WorkspaceRecord from server/src/services/workspaceService.ts. */
export type Workspace = {
  id: string
  title: string
  description: string | null
  icon: string | null
  defaultModel: string | null
  createdAt: string
  updatedAt: string
}

export type CreateWorkspaceInput = {
  title: string
  description?: string
  icon?: string
  defaultModel?: ChatModel
}

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>
