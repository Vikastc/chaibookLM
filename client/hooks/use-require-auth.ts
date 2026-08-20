"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useSession } from "@/lib/auth-client"

/**
 * Guards a page behind authentication. Redirects to /sign-in when there is
 * no session, and returns the session once resolved.
 */
export function useRequireAuth() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in")
  }, [isPending, session, router])

  return { session, isPending }
}
