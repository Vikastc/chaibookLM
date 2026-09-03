"use client"

import { useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  CheckIcon,
  CircleHelpIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  ListChecksIcon,
  NetworkIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { Panel, PanelHeader } from "@/components/panel"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useSources } from "@/features/sources/hooks"

import { useArtifacts, useCreateArtifact, useDeleteArtifact } from "../hooks"
import {
  ARTIFACT_TYPE_LABELS,
  type Artifact,
  type ArtifactStatus,
  type ArtifactType,
} from "../types"
import { ArtifactViewDialog } from "./artifact-view-dialog"
import { useUserQuota } from "@/hooks/use-user-quota"
import { QuotaBanner } from "@/features/conversations/components/quota-banner"

const GENERATORS: { type: ArtifactType; icon: LucideIcon; label: string }[] = [
  { type: "SUMMARY", icon: FileTextIcon, label: "Summary" },
  { type: "TAKEAWAYS", icon: ListChecksIcon, label: "Takeaways" },
  { type: "FLASHCARDS", icon: LayersIcon, label: "Flashcards" },
  { type: "QUIZ", icon: CircleHelpIcon, label: "Quiz" },
  { type: "MINDMAP", icon: NetworkIcon, label: "Mind map" },
  { type: "REPORT", icon: ClipboardListIcon, label: "Report" },
]

export function StudioPanel({
  workspaceId,
  className,
}: {
  workspaceId: string
  className?: string
}) {
  const [selected, setSelected] = useState<Artifact | null>(null)
  const sourcesQuery = useSources(workspaceId)
  const {
    data: artifacts,
    isPending,
    isError,
    refetch,
  } = useArtifacts(workspaceId)
  const createMutation = useCreateArtifact(workspaceId)
  const deleteMutation = useDeleteArtifact(workspaceId)
  const { data: userQuota } = useUserQuota()

  const readySourceCount =
    sourcesQuery.data?.filter((source) => source.status === "READY").length ?? 0
  const canGenerate = readySourceCount > 0

  async function handleGenerate(type: ArtifactType, label: string) {
    if (userQuota?.isExhausted) {
      toast.error("You have reached your free token limit.")
      return
    }
    try {
      await createMutation.mutateAsync({ type })
      toast.success(`Generating ${label.toLowerCase()}…`)
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : `Couldn't generate the ${label.toLowerCase()}.`
      )
    }
  }

  async function handleDelete(artifact: Artifact) {
    try {
      await deleteMutation.mutateAsync(artifact.id)
      toast.success(`Deleted "${artifact.title}"`)
      setSelected((current) => (current?.id === artifact.id ? null : current))
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't delete the artifact."
      )
    }
  }

  return (
    <Panel className={cn("bg-card", className)}>
      <PanelHeader title="Studio" />

      {userQuota?.isExhausted ? <QuotaBanner className="m-4 mb-0" /> : null}

      <div className="grid shrink-0 grid-cols-3 gap-3 p-4 sm:p-5 xl:grid-cols-6 xl:p-7">
        {GENERATORS.map(({ type, icon: Icon, label }) => {
          const isCreating =
            createMutation.isPending && createMutation.variables?.type === type
          return (
            <button
              key={type}
              type="button"
              disabled={createMutation.isPending || !canGenerate || userQuota?.isExhausted}
              onClick={() => void handleGenerate(type, label)}
              className="group flex min-h-24 flex-col items-start justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-28 sm:p-4"
            >
              {isCreating ? (
                <Spinner className="size-5 text-muted-foreground" />
              ) : (
                <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
              <span className="font-heading text-lg font-medium tracking-tight">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {!canGenerate && (
        <p className="px-5 pb-3 text-xs leading-relaxed text-muted-foreground">
          Add sources and wait for them to finish processing — then generate
          study material from them.
        </p>
      )}

      {artifacts && artifacts.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-3">
          <p className="px-2 pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Generated
          </p>
          <ul className="grid gap-1.5 pb-4">
            {artifacts.map((artifact) => (
              <ArtifactListItem
                key={artifact.id}
                artifact={artifact}
                onOpen={() => setSelected(artifact)}
                onDelete={() => void handleDelete(artifact)}
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === artifact.id
                }
              />
            ))}
          </ul>
        </div>
      )}

      {isError ? (
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none"
          >
            Couldn&apos;t load artifacts — click to retry.
          </button>
        </div>
      ) : null}

      {isPending || isError || artifacts?.length ? null : (
        <p className="mt-auto px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
          Generate study material once your sources are ready.
        </p>
      )}

      <ArtifactViewDialog
        workspaceId={workspaceId}
        artifactId={selected?.id ?? null}
        placeholder={selected ?? undefined}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </Panel>
  )
}

function ArtifactListItem({
  artifact,
  onOpen,
  onDelete,
  isDeleting,
}: {
  artifact: Artifact
  onOpen: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <li className="group flex items-center gap-2.5 rounded-xl border border-transparent p-2.5 transition-colors hover:bg-muted/60">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <p className="truncate text-sm font-medium">{artifact.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ARTIFACT_TYPE_LABELS[artifact.type]} ·{" "}
          {formatDistanceToNow(new Date(artifact.createdAt), {
            addSuffix: true,
          })}
        </p>
      </button>

      <StatusIndicator
        status={artifact.status}
        reason={artifact.metadata?.processingError ?? null}
      />

      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label={`Delete ${artifact.title}`}
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
  status: ArtifactStatus
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
        <span title="Generating" className="shrink-0">
          <Spinner className="size-3.5 text-muted-foreground" />
          <span className="sr-only">Generating</span>
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
              ? `${reason} (delete and regenerate to retry)`
              : "Generation failed"
          }
          className="shrink-0"
        >
          <TriangleAlertIcon className="size-4 text-destructive" />
          <span className="sr-only">Failed</span>
        </span>
      )
  }
}
