import { api } from "@/lib/api"

import type { Artifact, CreateArtifactInput } from "./types"

function basePath(workspaceId: string) {
  return `/api/workspaces/${workspaceId}/artifacts`
}

export function listArtifacts(workspaceId: string, signal?: AbortSignal) {
  return api.get<Artifact[]>(basePath(workspaceId), signal)
}

export function getArtifact(workspaceId: string, artifactId: string) {
  return api.get<Artifact>(`${basePath(workspaceId)}/${artifactId}`)
}

export function createArtifact(
  workspaceId: string,
  input: CreateArtifactInput
) {
  return api.post<Artifact>(basePath(workspaceId), input)
}

export function deleteArtifact(workspaceId: string, artifactId: string) {
  return api.delete<void>(`${basePath(workspaceId)}/${artifactId}`)
}