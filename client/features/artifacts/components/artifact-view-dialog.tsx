"use client"

import { format } from "date-fns"
import { ArrowLeftIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { useArtifact } from "../hooks"
import { ARTIFACT_TYPE_LABELS, type Artifact } from "../types"
import { ArtifactContent } from "./artifact-content"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Queued for generation",
  PROCESSING: "Generating…",
  READY: "Ready",
  FAILED: "Generation failed",
}

export function ArtifactViewDialog({
  workspaceId,
  artifactId,
  placeholder,
  open,
  onOpenChange,
}: {
  workspaceId: string
  artifactId: string | null
  placeholder?: Artifact
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: artifact } = useArtifact(
    workspaceId,
    artifactId ?? "",
    placeholder,
    open && !!artifactId
  )

  if (!open || !artifactId) return null

  const processingError = artifact?.metadata?.processingError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!inset-0 !h-svh !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none"
        showCloseButton={false}
      >
        {!artifact ? (
          <div className="m-auto grid w-full max-w-3xl gap-3 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[60svh] rounded-2xl" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex shrink-0 items-center gap-4 border-b bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-8">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label="Back to Studio"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
              <DialogHeader className="min-w-0 gap-0.5">
                <DialogTitle className="truncate font-heading text-lg font-medium sm:text-xl">
                  {artifact.title}
                </DialogTitle>
                <DialogDescription className="truncate text-xs">
                  {ARTIFACT_TYPE_LABELS[artifact.type]} ·{" "}
                  {STATUS_LABELS[artifact.status]} ·{" "}
                  {format(new Date(artifact.createdAt), "MMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-10 sm:py-12">
                {artifact.status === "PENDING" ||
                artifact.status === "PROCESSING" ? (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
                    <span className="relative flex size-14 items-center justify-center rounded-full bg-accent">
                      <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                      <span className="size-2.5 animate-pulse rounded-full bg-primary" />
                    </span>
                    <div>
                      <p className="font-heading text-xl font-medium">
                        Making your{" "}
                        {ARTIFACT_TYPE_LABELS[artifact.type].toLowerCase()}…
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This view will update when it is ready.
                      </p>
                    </div>
                  </div>
                ) : artifact.status === "FAILED" ? (
                  <div className="mx-auto mt-16 flex max-w-xl items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
                    <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <div className="grid gap-1 text-sm">
                      <p className="font-medium text-destructive">
                        Generation failed
                      </p>
                      <p className="leading-relaxed text-muted-foreground">
                        {processingError || "An unexpected error occurred."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ArtifactContent artifact={artifact} />
                )}
              </div>
            </main>

            {artifact.status !== "PENDING" &&
              artifact.status !== "PROCESSING" && (
                <footer className="shrink-0 border-t bg-card/80 px-5 py-3 text-xs text-muted-foreground sm:px-8">
                  <span className="flex items-center gap-1.5">
                    <Trash2Icon className="size-3" /> Delete this artifact from
                    the Studio list.
                  </span>
                </footer>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
