export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  details: () => [...workspaceKeys.all, "detail"] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
}

export const sourceKeys = {
  all: ["sources"] as const,
  lists: (workspaceId: string) =>
    [...sourceKeys.all, "list", workspaceId] as const,
  details: () => [...sourceKeys.all, "detail"] as const,
  detail: (workspaceId: string, sourceId: string) =>
    [...sourceKeys.details(), workspaceId, sourceId] as const,
}

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: (workspaceId: string) =>
    [...conversationKeys.all, "list", workspaceId] as const,
  messages: (workspaceId: string, conversationId: string) =>
    [...conversationKeys.all, "messages", workspaceId, conversationId] as const,
}
