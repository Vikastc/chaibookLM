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

export const artifactKeys = {
  all: ["artifacts"] as const,
  lists: (workspaceId: string) =>
    [...artifactKeys.all, "list", workspaceId] as const,
  details: () => [...artifactKeys.all, "detail"] as const,
  detail: (workspaceId: string, artifactId: string) =>
    [...artifactKeys.details(), workspaceId, artifactId] as const,
}

export const userKeys = {
  all: ["user"] as const,
  quota: () => [...userKeys.all, "quota"] as const,
}

