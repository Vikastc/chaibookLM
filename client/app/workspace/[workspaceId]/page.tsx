"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  BookOpenIcon,
  CircleHelpIcon,
  FileTextIcon,
  LayersIcon,
  MoreHorizontalIcon,
  NetworkIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"

import { useRequireAuth } from "@/hooks/use-require-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/delete-workspace-dialog"
import { WorkspaceDialog } from "@/features/workspaces/components/workspace-dialog"
import { useWorkspace } from "@/features/workspaces/hooks"
import {
  CHAT_MODEL_LABELS,
  type ChatModel,
  type Workspace,
} from "@/features/workspaces/types"

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { session, isPending } = useRequireAuth()

  if (isPending || !session) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return <WorkspaceView workspaceId={workspaceId} />
}

function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const {
    data: workspace,
    isPending,
    isError,
    error,
  } = useWorkspace(workspaceId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isPending) {
    return (
      <div className="flex h-svh flex-col bg-muted/30">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-5 w-48" />
        </header>
        <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Skeleton className="rounded-2xl max-lg:h-64" />
          <Skeleton className="rounded-2xl max-lg:h-96" />
          <Skeleton className="rounded-2xl max-lg:h-64" />
        </main>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid min-h-svh place-items-center px-6">
        <div className="flex max-w-xs flex-col items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent">
            <TriangleAlertIcon className="size-4.5 text-accent-foreground" />
          </span>
          <h1 className="mt-4 text-sm font-medium">
            {error instanceof Error ? error.message : "Workspace not found"}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            It may have been deleted, or the link is wrong.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            render={<Link href="/" />}
          >
            Back to workspaces
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col bg-muted/30">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/" aria-label="Back to workspaces" />}
          >
            <ArrowLeftIcon />
          </Button>
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm leading-none">
            {workspace.icon ? (
              <span aria-hidden="true">{workspace.icon}</span>
            ) : (
              <BookOpenIcon className="size-3.5 text-accent-foreground" />
            )}
          </span>
          <h1 className="truncate text-sm font-medium tracking-tight">
            {workspace.title}
          </h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {CHAT_MODEL_LABELS[
              (workspace.defaultModel as ChatModel) ?? "gpt-4o-mini"
            ] ?? workspace.defaultModel}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Workspace actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="grid flex-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <SourcesPanel />
        <ChatPanel workspace={workspace} />
        <StudioPanel />
      </main>

      <WorkspaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspace={workspace}
      />
      <DeleteWorkspaceDialog
        workspace={workspace}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace("/")}
      />
    </div>
  )
}

function Panel({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card ${className ?? ""}`}
      {...props}
    >
      {children}
    </section>
  )
}

function PanelHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </header>
  )
}

function SourcesPanel() {
  return (
    <Panel className="max-lg:min-h-72">
      <PanelHeader title="Sources">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("Adding sources arrives in Phase 2 — coming next.")
          }
        >
          <PlusIcon />
          Add
        </Button>
      </PanelHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent">
          <UploadIcon className="size-4 text-accent-foreground" />
        </span>
        <p className="mt-1 text-sm font-medium">No sources yet</p>
        <p className="max-w-56 text-xs leading-relaxed text-muted-foreground">
          Add material and every answer will be grounded in it — with citations.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {["PDF", "Website", "YouTube", "Text"].map((type) => (
            <span
              key={type}
              className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function ChatPanel({ workspace }: { workspace: Workspace }) {
  return (
    <Panel className="max-lg:min-h-96">
      <PanelHeader title="Chat">
        <Badge variant="secondary">
          {CHAT_MODEL_LABELS[
            (workspace.defaultModel as ChatModel) ?? "gpt-4o-mini"
          ] ?? workspace.defaultModel}
        </Badge>
      </PanelHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white shadow-xs">
          <SparklesIcon className="size-4" />
        </span>
        <p className="mt-1 text-sm font-medium">
          Ask {workspace.title} anything
        </p>
        <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">
          Answers come with citations pointing back to your sources.
        </p>
      </div>
      <footer className="shrink-0 p-3">
        <div className="flex items-center gap-2 rounded-2xl border bg-muted/50 py-1.5 pr-1.5 pl-4">
          <input
            disabled
            placeholder="Add a source to start chatting"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button size="icon-sm" disabled aria-label="Send message">
            <ArrowUpIcon />
          </Button>
        </div>
      </footer>
    </Panel>
  )
}

const STUDIO_TILES: { icon: LucideIcon; label: string }[] = [
  { icon: FileTextIcon, label: "Summary" },
  { icon: LayersIcon, label: "Flashcards" },
  { icon: CircleHelpIcon, label: "Quiz" },
  { icon: NetworkIcon, label: "Mind map" },
]

function StudioPanel() {
  return (
    <Panel className="max-lg:min-h-72">
      <PanelHeader title="Studio" />
      <div className="grid grid-cols-2 gap-2 p-3">
        {STUDIO_TILES.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              toast.info(
                "The studio arrives in Phase 4 — after sources and chat."
              )
            }
            className="flex flex-col items-start gap-2.5 rounded-xl border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
      <p className="mt-auto px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground">
        Generate study material once your sources are ready.
      </p>
    </Panel>
  )
}
