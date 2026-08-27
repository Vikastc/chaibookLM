"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { conversationKeys } from "@/lib/query-keys"

import {
  deleteConversation,
  getConversationMessages,
  listConversations,
} from "./api"

export function useConversations(workspaceId: string) {
  return useQuery({
    queryKey: conversationKeys.lists(workspaceId),
    queryFn: () => listConversations(workspaceId),
  })
}

export function useConversationMessages(
  workspaceId: string,
  conversationId: string | null
) {
  return useQuery({
    queryKey: conversationKeys.messages(workspaceId, conversationId ?? ""),
    queryFn: () => getConversationMessages(workspaceId, conversationId!),
    enabled: Boolean(conversationId),
  })
}

export function useDeleteConversation(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) =>
      deleteConversation(workspaceId, conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({
        queryKey: conversationKeys.messages(workspaceId, conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(workspaceId),
      })
    },
  })
}