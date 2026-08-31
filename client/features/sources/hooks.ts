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

// Phase 1 — fast poll: covers normal processing (most sources finish in < 30s).
const FAST_POLL_MS = 3_000
const FAST_POLL_WINDOW_MS = 3 * 60 * 1000 // 3 minutes
const MAX_POLL_FAILURES = 3 // stop on repeated network errors

// Phase 2 — slow poll: source is stuck but we keep watching so the UI
// auto-updates when the server reaper marks it FAILED (runs every 10 min,
// stale threshold is 5 min → FAILED within ~15 min worst case).
const SLOW_POLL_MS = 60_000
const SLOW_POLL_WINDOW_MS = 20 * 60 * 1000 // watch for up to 20 min total

export function useSources(workspaceId: string, q?: string) {
  return useQuery({
    queryKey: [...sourceKeys.lists(workspaceId), q ?? ""],
    queryFn: ({ signal }) => listSources(workspaceId, q, signal),
    // Poll while anything is still being processed by the Inngest worker.
    //
    // Phase 1 (0–3 min)  — fast poll every 3 s: covers normal processing.
    // Phase 2 (3–20 min) — slow poll every 60 s: catches the reaper marking
    //   a stuck source FAILED so the UI updates without a manual refresh.
    // Stop conditions:
    //   • No more pending/processing sources.
    //   • Repeated network errors (server unreachable).
    //   • Total age of ALL stuck sources exceeds the slow-poll window (20 min).
    refetchInterval: (query) => {
      if (
        query.state.error instanceof ApiError &&
        query.state.error.status === 0 &&
        query.state.fetchFailureCount >= MAX_POLL_FAILURES
      ) {
        return false
      }

      const pending = query.state.data?.filter(
        (s) => s.status === "PENDING" || s.status === "PROCESSING"
      )

      if (!pending?.length) return false

      const oldestAge = Math.max(
        ...pending.map((s) => Date.now() - new Date(s.updatedAt).getTime())
      )

      // Stop entirely once we're past the slow-poll window.
      if (oldestAge > SLOW_POLL_WINDOW_MS) return false

      // Phase 1: fast poll while sources are fresh.
      if (oldestAge <= FAST_POLL_WINDOW_MS) return FAST_POLL_MS

      // Phase 2: slow poll while waiting for the reaper.
      return SLOW_POLL_MS
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
