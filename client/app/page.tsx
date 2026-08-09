"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpenIcon, FileTextIcon } from "lucide-react"

import { useSession } from "@/lib/auth-client"
import { UserMenu } from "@/components/auth/user-menu"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in")
  }, [isPending, session, router])

  if (isPending || !session) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpenIcon className="size-3.5" />
          </span>
          chaibook
        </span>
        <UserMenu user={session.user} />
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-xs flex-col items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
            <FileTextIcon className="size-4.5 text-muted-foreground" />
          </span>
          <h1 className="mt-4 text-sm font-medium">No notebooks yet</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Upload a source and chaibook will help you read, question, and
            remember it.
          </p>
        </div>
      </main>
    </div>
  )
}
