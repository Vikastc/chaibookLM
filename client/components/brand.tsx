import { BookOpenIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-md bg-brand text-white shadow-xs",
        className
      )}
    >
      <BookOpenIcon className="size-3.5" />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading text-lg font-medium tracking-tight",
        className
      )}
    >
      <LogoMark className="size-7 rounded-lg [&_svg]:size-4" />
      RAG Studio
    </span>
  )
}
