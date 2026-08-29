"use client"

import { format } from "date-fns"
import { Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
      <DialogContent className="gap-5 p-5 sm:max-w-2xl">
        {!artifact ? (
          <div className="grid gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 font-heading text-xl text-balance">
                {artifact.title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {ARTIFACT_TYPE_LABELS[artifact.type]}
                </Badge>
                <span>
                  {STATUS_LABELS[artifact.status]} ·{" "}
                  {format(new Date(artifact.createdAt), "MMM d, yyyy")}
                </span>
              </DialogDescription>
            </DialogHeader>

            {artifact.status === "PENDING" || artifact.status === "PROCESSING" ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                Generating from your sources — this usually takes a few seconds.
              </div>
            ) : artifact.status === "FAILED" ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
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
              <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-muted/50 p-4">
                <ArtifactContent artifact={artifact} />
              </div>
            )}

            {artifact.status !== "PENDING" && artifact.status !== "PROCESSING" && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trash2Icon className="size-3" />
                Delete artifacts from the Studio list.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}