import { api } from "@/lib/api"

import type { CreateTextSourceInput, ImportUrlInput, Source } from "./types"

function basePath(workspaceId: string) {
  return `/api/workspaces/${workspaceId}/sources`
}

export function listSources(
  workspaceId: string,
  q?: string,
  signal?: AbortSignal
) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  const query = params.toString()
  return api.get<Source[]>(
    `${basePath(workspaceId)}${query ? `?${query}` : ""}`,
    signal
  )
}

export function getSource(workspaceId: string, sourceId: string) {
  return api.get<Source>(`${basePath(workspaceId)}/${sourceId}`)
}

export function createTextSource(
  workspaceId: string,
  input: CreateTextSourceInput
) {
  return api.post<Source>(`${basePath(workspaceId)}/text-markdown`, input)
}

export function importWebsite(workspaceId: string, input: ImportUrlInput) {
  return api.post<Source>(`${basePath(workspaceId)}/website`, input)
}

export function importYoutube(workspaceId: string, input: ImportUrlInput) {
  return api.post<Source>(`${basePath(workspaceId)}/youtube`, input)
}

export function uploadPdf(workspaceId: string, file: File, title?: string) {
  const form = new FormData()
  form.append("file", file)
  if (title?.trim()) form.append("title", title.trim())
  return api.postForm<Source>(`${basePath(workspaceId)}/pdf`, form)
}

export function deleteSource(workspaceId: string, sourceId: string) {
  return api.delete<void>(`${basePath(workspaceId)}/${sourceId}`)
}

export function bulkDeleteSources(workspaceId: string, sourceIds: string[]) {
  return api.post<void>(`${basePath(workspaceId)}/bulk-delete`, { sourceIds })
}
