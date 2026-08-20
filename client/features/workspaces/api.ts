import { api } from "@/lib/api"

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "./types"

export function listWorkspaces() {
  return api.get<Workspace[]>("/api/workspaces")
}

export function getWorkspace(workspaceId: string) {
  return api.get<Workspace>(`/api/workspaces/${workspaceId}`)
}

export function createWorkspace(input: CreateWorkspaceInput) {
  return api.post<Workspace>("/api/workspaces", input)
}

export function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput
) {
  return api.patch<Workspace>(`/api/workspaces/${workspaceId}`, input)
}

export function deleteWorkspace(workspaceId: string) {
  return api.delete<void>(`/api/workspaces/${workspaceId}`)
}
