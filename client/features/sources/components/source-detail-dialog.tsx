"use client"

import { format } from "date-fns"
import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { useSource } from "../hooks"
import { SOURCE_TYPE_LABELS, type Source, type SourceStatus } from "../types"

const STATUS_LABELS: Record<SourceStatus, string> = {
  PENDING: "Queued for processing",
  PROCESSING: "Processing…",
  READY: "Ready",
  FAILED: "Processing failed",
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SourceDetailDialog({
  workspaceId,
  sourceId,
  placeholder,
  open,
  onOpenChange,
}: {
  workspaceId: string
  sourceId: string | null
  placeholder?: Source
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: source } = useSource(
    workspaceId,
    sourceId ?? "",
    placeholder,
    open && !!sourceId
  )

  if (!open || !sourceId) return null

  // PDF "Open original" is disabled — Cloudinary blocks direct raw-asset
  // delivery on this account. Only external sources (website/YouTube) link out.
  const link = source?.type === "PDF" ? undefined : source?.url

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-2xl">
        {!source ? (
          <div className="grid gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 font-heading text-xl text-balance">
                {source.title}
              </DialogTitle>
              <DialogDescription>
                {SOURCE_TYPE_LABELS[source.type]} · added{" "}
                {format(new Date(source.createdAt), "MMM d, yyyy")} ·{" "}
                {STATUS_LABELS[source.status]}
              </DialogDescription>
            </DialogHeader>

            {/* Metadata facts */}
            <dl className="grid gap-2 text-sm">
              {source.url && (
                <div className="flex items-center gap-2">
                  <dt className="shrink-0 text-muted-foreground">Link</dt>
                  <dd className="min-w-0">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      {source.url}
                    </a>
                  </dd>
                </div>
              )}
              {source.metadata?.fileName && (
                <div className="flex items-center gap-2">
                  <dt className="shrink-0 text-muted-foreground">File</dt>
                  <dd className="truncate">
                    {source.metadata.fileName}
                    {source.metadata.fileSize
                      ? ` · ${formatBytes(source.metadata.fileSize)}`
                      : ""}
                    {source.metadata.pageCount
                      ? ` · ${source.metadata.pageCount} pages`
                      : ""}
                  </dd>
                </div>
              )}
            </dl>

            <div className="max-h-80 overflow-y-auto rounded-xl bg-muted/50 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {source.content?.trim() ||
                  "Content will appear here once processing finishes."}
              </p>
            </div>

            {link && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={link} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLinkIcon />
                  Open original
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
