"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  AlignLeftIcon,
  CheckIcon,
  ClockIcon,
  FileCodeIcon,
  FileTextIcon,
  GlobeIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
  TvMinimalPlayIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { Panel, PanelHeader } from "@/components/panel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

import {
  useBulkDeleteSources,
  useDeleteSource,
  useRetrySource,
  useSources,
} from "../hooks"
import {
  SOURCE_TYPE_LABELS,
  type Source,
  type SourceStatus,
  type SourceType,
} from "../types"
import { AddSourceDialog } from "./add-source-dialog"
import { SourceDetailDialog } from "./source-detail-dialog"
import { useUserQuota } from "@/hooks/use-user-quota"
import { QuotaBanner } from "@/features/conversations/components/quota-banner"

const TYPE_ICONS: Record<SourceType, LucideIcon> = {
  PDF: FileTextIcon,
  WEBSITE: GlobeIcon,
  YOUTUBE: TvMinimalPlayIcon,
  TEXT: AlignLeftIcon,
  MARKDOWN: FileCodeIcon,
}

export function SourcesPanel({
  workspaceId,
  className,
}: {
  workspaceId: string
  className?: string
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const {
    data: sources,
    isPending,
    isError,
    error,
    refetch,
  } = useSources(workspaceId, debouncedSearch || undefined)

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [detailSourceId, setDetailSourceId] = useState<string | null>(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  const deleteMutation = useDeleteSource(workspaceId)
  const bulkDeleteMutation = useBulkDeleteSources(workspaceId)
  const retryMutation = useRetrySource(workspaceId)
  const { data: userQuota } = useUserQuota()

  // Selected ids that still exist in the current list (pruned on refetch).
  const activeSelectedIds = useMemo(
    () =>
      sources
        ? new Set(
            [...selectedIds].filter((id) => sources.some((s) => s.id === id))
          )
        : selectedIds,
    [selectedIds, sources]
  )

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete(source: Source) {
    try {
      await deleteMutation.mutateAsync(source.id)
      toast.success(`Deleted "${source.title}"`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't delete the source."
      )
    }
  }

  async function handleBulkDelete() {
    const ids = [...activeSelectedIds]
    try {
      await bulkDeleteMutation.mutateAsync(ids)
      toast.success(
        `Deleted ${ids.length} ${ids.length === 1 ? "source" : "sources"}`
      )
      setSelectedIds(new Set())
      setBulkConfirmOpen(false)
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't delete the selected sources."
      )
    }
  }

  async function handleRetry(source: Source) {
    if (userQuota?.isExhausted) {
      toast.error("You have reached your free token limit.")
      return
    }
    try {
      await retryMutation.mutateAsync(source.id)
      toast.success(`Retrying "${source.title}"`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't retry the source."
      )
    }
  }

  const sourceList = sources ?? []
  const detailSource = sourceList.find((s) => s.id === detailSourceId)

  return (
    <Panel className={cn("bg-card", className)}>
      <PanelHeader title="Sources">
        <div className="flex items-center gap-2">
          {sourceList.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {sourceList.length}
            </span>
          )}
          <Button
            size="sm"
            disabled={userQuota?.isExhausted}
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon />
            Add
          </Button>
        </div>
      </PanelHeader>

      {userQuota?.isExhausted ? <QuotaBanner className="m-3 mb-0" /> : null}

      <div className="shrink-0 border-b px-3 py-2.5">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sources"
            className="h-9 rounded-full border-transparent bg-muted/60 pl-9 focus-visible:border-border focus-visible:bg-card"
          />
        </div>
      </div>

      {activeSelectedIds.size > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-accent/50 px-4 py-2">
          <span className="text-sm font-medium">
            {activeSelectedIds.size} selected
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2Icon />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isPending ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Couldn't load sources."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : sourceList.length === 0 ? (
          debouncedSearch ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing matches &ldquo;{debouncedSearch}&rdquo;
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent">
                <UploadIcon className="size-5 text-accent-foreground" />
              </span>
              <p className="mt-1 font-heading text-lg font-medium">
                No sources yet
              </p>
              <p className="max-w-64 text-sm leading-relaxed text-muted-foreground">
                Add material and every answer will be grounded in it — with
                citations.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon />
                Add a source
              </Button>
            </div>
          )
        ) : (
          <ul className="grid gap-1.5">
            {sourceList.map((source) => (
              <SourceListItem
                key={source.id}
                source={source}
                selected={activeSelectedIds.has(source.id)}
                onToggleSelect={() => toggleSelect(source.id)}
                onOpen={() => setDetailSourceId(source.id)}
                onDelete={() => handleDelete(source)}
                onRetry={() => handleRetry(source)}
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === source.id
                }
                isRetrying={
                  retryMutation.isPending &&
                  retryMutation.variables === source.id
                }
              />
            ))}
          </ul>
        )}
      </div>

      <AddSourceDialog
        workspaceId={workspaceId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <SourceDetailDialog
        workspaceId={workspaceId}
        sourceId={detailSourceId}
        placeholder={detailSource}
        open={detailSourceId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSourceId(null)
        }}
      />

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {activeSelectedIds.size}{" "}
              {activeSelectedIds.size === 1 ? "source" : "sources"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected sources and their indexed content will be permanently
              removed from this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending && <Spinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

function SourceListItem({
  source,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onRetry,
  isDeleting,
  isRetrying,
}: {
  source: Source
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onDelete: () => void
  onRetry: () => void
  isDeleting: boolean
  isRetrying: boolean
}) {
  const TypeIcon = TYPE_ICONS[source.type]

  return (
    <li
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors",
        selected
          ? "border-primary/30 bg-accent/60"
          : "border-transparent hover:bg-muted/60"
      )}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={selected}
        aria-label={`Select ${source.title}`}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          selected
            ? "border-primary/40 bg-primary text-primary-foreground"
            : "bg-muted/60 text-muted-foreground group-hover:bg-card"
        )}
      >
        {selected ? (
          <CheckIcon className="size-4" />
        ) : (
          <TypeIcon className="size-4" />
        )}
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <p className="truncate text-sm font-medium">{source.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {SOURCE_TYPE_LABELS[source.type]} ·{" "}
          {formatDistanceToNow(new Date(source.createdAt), {
            addSuffix: true,
          })}
        </p>
      </button>

      <StatusIndicator
        status={source.status}
        reason={source.metadata?.processingError ?? null}
      />

      {source.status === "FAILED" && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          aria-label={`Retry processing ${source.title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {isRetrying ? <Spinner /> : <RotateCcwIcon className="size-3.5" />}
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label={`Delete ${source.title}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {isDeleting ? <Spinner /> : <Trash2Icon className="size-3.5" />}
      </button>
    </li>
  )
}

function StatusIndicator({
  status,
  reason,
}: {
  status: SourceStatus
  reason?: string | null
}) {
  switch (status) {
    case "READY":
      return (
        <span title="Ready" className="shrink-0">
          <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="sr-only">Ready</span>
        </span>
      )
    case "PROCESSING":
      return (
        <span title="Processing" className="shrink-0">
          <Spinner className="size-3.5 text-muted-foreground" />
          <span className="sr-only">Processing</span>
        </span>
      )
    case "PENDING":
      return (
        <span title="Queued" className="shrink-0">
          <ClockIcon className="size-4 text-muted-foreground" />
          <span className="sr-only">Queued</span>
        </span>
      )
    case "FAILED":
      return (
        <span
          title={
            reason?.trim()
              ? `${reason} (click the retry button to reprocess)`
              : "Processing failed"
          }
          className="shrink-0"
        >
          <TriangleAlertIcon className="size-4 text-destructive" />
          <span className="sr-only">Failed</span>
        </span>
      )
  }
}
