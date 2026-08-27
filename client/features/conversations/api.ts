import { api } from "@/lib/api"

import type { Conversation, ConversationMessage } from "./types"

function basePath(workspaceId: string) {
  return `/api/workspaces/${workspaceId}/conversations`
}

export function listConversations(workspaceId: string) {
  return api.get<Conversation[]>(basePath(workspaceId))
}

export function getConversationMessages(
  workspaceId: string,
  conversationId: string
) {
  return api.get<ConversationMessage[]>(
    `${basePath(workspaceId)}/${conversationId}/messages`
  )
}

export function deleteConversation(
  workspaceId: string,
  conversationId: string
) {
  return api.delete<void>(`${basePath(workspaceId)}/${conversationId}`)
}