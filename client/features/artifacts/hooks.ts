"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import { artifactKeys } from "@/lib/query-keys"

import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifacts,
} from "./api"
import type { Artifact, CreateArtifactInput } from "./types"

const POLL_INTERVAL_MS = 3000
const MAX_POLL_FAILURES = 3

export function useArtifacts(workspaceId: string) {
  return useQuery({
    queryKey: artifactKeys.lists(workspaceId),
    queryFn: ({ signal }) => listArtifacts(workspaceId, signal),
    // Poll while any artifact is queued/processing in the Inngest worker.
    // Stop polling when the server is unreachable so the UI doesn't spin
    // requests forever.
    refetchInterval: (query) => {
      if (
        query.state.error instanceof ApiError &&
        query.state.error.status === 0 &&
        query.state.fetchFailureCount >= MAX_POLL_FAILURES
      ) {
        return false
      }
      return query.state.data?.some(
        (a) => a.status === "PENDING" || a.status === "PROCESSING"
      )
        ? POLL_INTERVAL_MS
        : false
    },
  })
}

export function useArtifact(
  workspaceId: string,
  artifactId: string,
  placeholder?: Artifact,
  enabled = true
) {
  return useQuery({
    queryKey: artifactKeys.detail(workspaceId, artifactId),
    queryFn: () => getArtifact(workspaceId, artifactId),
    placeholderData: placeholder,
    enabled: enabled && artifactId.length > 0,
  })
}

function useInvalidateArtifacts(workspaceId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: artifactKeys.lists(workspaceId),
    })
}

export function useCreateArtifact(workspaceId: string) {
  const invalidate = useInvalidateArtifacts(workspaceId)
  return useMutation({
    mutationFn: (input: CreateArtifactInput) =>
      createArtifact(workspaceId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteArtifact(workspaceId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateArtifacts(workspaceId)
  return useMutation({
    mutationFn: (artifactId: string) => deleteArtifact(workspaceId, artifactId),
    onSuccess: (_data, artifactId) => {
      queryClient.removeQueries({
        queryKey: artifactKeys.detail(workspaceId, artifactId),
      })
      invalidate()
    },
  })
}