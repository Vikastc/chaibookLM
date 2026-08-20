"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { workspaceKeys } from "@/lib/query-keys"

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "./api"
import type { UpdateWorkspaceInput } from "./types"

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: listWorkspaces,
  })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspace(workspaceId),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace)
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      updateWorkspace(workspaceId, input),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKeys.detail(workspaceId), workspace)
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: (_data, workspaceId) => {
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) })
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}
