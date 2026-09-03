"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { userKeys } from "@/lib/query-keys"

export interface UserQuota {
  usage: number
  limit: number
  isExhausted: boolean
}

export function useUserQuota() {
  return useQuery({
    queryKey: userKeys.quota(),
    queryFn: () => api.get<UserQuota>("/api/user/quota"),
    staleTime: 10_000,
  })
}
