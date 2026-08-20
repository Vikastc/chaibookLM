/** Mirrors the server's CHAT_MODELS (server/src/validators/workspaceValidator.ts). */
export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const
export type ChatModel = (typeof CHAT_MODELS)[number]

export const CHAT_MODEL_LABELS: Record<ChatModel, string> = {
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4o": "GPT-4o",
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
