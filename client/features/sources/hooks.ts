"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import { sourceKeys } from "@/lib/query-keys"

import {
  bulkDeleteSources,
  createTextSource,
  deleteSource,
  getSource,
  importWebsite,
  importYoutube,
  listSources,
  retrySource,
  uploadPdf,
} from "./api"
import type { CreateTextSourceInput, ImportUrlInput, Source } from "./types"

const POLL_INTERVAL_MS = 3000
const MAX_POLL_FAILURES = 3

export function useSources(workspaceId: string, q?: string) {
  return useQuery({
    queryKey: [...sourceKeys.lists(workspaceId), q ?? ""],
    queryFn: ({ signal }) => listSources(workspaceId, q, signal),
    // Poll while anything is still being processed by the Inngest worker.
    // Stop polling when the server is unreachable (e.g. it crashed or was
    // stopped) so the UI doesn't keep firing requests forever.
    refetchInterval: (query) => {
      if (
        query.state.error instanceof ApiError &&
        query.state.error.status === 0 &&
        query.state.fetchFailureCount >= MAX_POLL_FAILURES
      ) {
        return false
      }
      return query.state.data?.some(
        (s) => s.status === "PENDING" || s.status === "PROCESSING"
      )
        ? POLL_INTERVAL_MS
        : false
    },
  })
}

export function useSource(
  workspaceId: string,
  sourceId: string,
  placeholderData?: Source,
  enabled = true
) {
  return useQuery({
    queryKey: sourceKeys.detail(workspaceId, sourceId),
    queryFn: () => getSource(workspaceId, sourceId),
    placeholderData,
    enabled: enabled && sourceId.length > 0,
  })
}

function useInvalidateSources(workspaceId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: sourceKeys.lists(workspaceId),
    })
}

export function useCreateTextSource(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (input: CreateTextSourceInput) =>
      createTextSource(workspaceId, input),
    onSuccess: invalidate,
  })
}

export function useImportWebsite(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (input: ImportUrlInput) => importWebsite(workspaceId, input),
    onSuccess: invalidate,
  })
}

export function useImportYoutube(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (input: ImportUrlInput) => importYoutube(workspaceId, input),
    onSuccess: invalidate,
  })
}

export function useUploadPdf(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      uploadPdf(workspaceId, file, title),
    onSuccess: invalidate,
  })
}

export function useDeleteSource(workspaceId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(workspaceId, sourceId),
    onSuccess: (_data, sourceId) => {
      queryClient.removeQueries({
        queryKey: sourceKeys.detail(workspaceId, sourceId),
      })
      invalidate()
    },
  })
}

export function useBulkDeleteSources(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (sourceIds: string[]) =>
      bulkDeleteSources(workspaceId, sourceIds),
    onSuccess: invalidate,
  })
}

export function useRetrySource(workspaceId: string) {
  const invalidate = useInvalidateSources(workspaceId)
  return useMutation({
    mutationFn: (sourceId: string) => retrySource(workspaceId, sourceId),
    onSuccess: invalidate,
  })
}
