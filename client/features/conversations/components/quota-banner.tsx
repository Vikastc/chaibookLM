"use client"

import { AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useUserQuota } from "@/hooks/use-user-quota"

export function QuotaBanner({ className }: { className?: string }) {
  const { data: quota } = useUserQuota()

  if (!quota?.isExhausted) {
    return null
  }

  const limitFormatted = quota.limit.toLocaleString()

  return (
    <div className={className}>
      <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">
          Free token quota reached
        </AlertTitle>
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300/90">
          You&apos;ve used all your {limitFormatted} free tokens. Thank you for
          exploring RAG Studio!
        </AlertDescription>
      </Alert>
    </div>
  )
}
