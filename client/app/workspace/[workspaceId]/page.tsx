"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BoxesIcon,
  ChevronLeftIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { useRequireAuth } from "@/hooks/use-require-auth"
import { cn } from "@/lib/utils"
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
import { StudioPanel } from "@/features/artifacts/components/studio-panel"
import { ChatPanel } from "@/features/conversations/components/chat-panel"
import { SourcesPanel } from "@/features/sources/components/sources-panel"
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/delete-workspace-dialog"
import { WorkspaceDialog } from "@/features/workspaces/components/workspace-dialog"
import { useWorkspace } from "@/features/workspaces/hooks"
import { CHAT_MODEL_LABELS, type ChatModel } from "@/features/workspaces/types"

type WorkspaceMode = "sources" | "chat" | "studio"

const WORKSPACE_MODES: {
  id: WorkspaceMode
  label: string
  icon: LucideIcon
}[] = [
  {
    id: "sources",
    label: "Library",
    icon: BookOpenIcon,
  },
  {
    id: "chat",
    label: "Ask",
    icon: MessageCircleIcon,
  },
  {
    id: "studio",
    label: "Make",
    icon: SparklesIcon,
  },
]

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
  const [mode, setMode] = useState<WorkspaceMode>("chat")
  const activeMode = WORKSPACE_MODES.find((item) => item.id === mode)!

  if (isPending) {
    return (
      <div className="flex h-svh flex-col bg-muted/40">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-6 w-56" />
        </header>
        <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Skeleton className="rounded-2xl max-lg:h-72" />
          <Skeleton className="rounded-2xl max-lg:h-96" />
          <Skeleton className="rounded-2xl max-lg:h-72" />
        </main>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid min-h-svh place-items-center px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent">
            <TriangleAlertIcon className="size-5 text-accent-foreground" />
          </span>
          <h1 className="mt-5 font-heading text-xl font-medium">
            {error instanceof Error ? error.message : "Workspace not found"}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            It may have been deleted, or the link is wrong.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Back to workspaces
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="z-10 hidden w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="flex items-center px-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/" aria-label="Back to workspaces" />}
          >
            <ChevronLeftIcon />
          </Button>
        </div>

        <div className="mt-7 px-2">
          <span className="flex size-9 items-center justify-center rounded-md border bg-muted text-lg leading-none">
            {workspace.icon ? (
              <span aria-hidden="true">{workspace.icon}</span>
            ) : (
              <BookOpenIcon className="size-5 text-accent-foreground" />
            )}
          </span>
          <h1 className="mt-3 line-clamp-2 text-lg leading-snug font-semibold">
            {workspace.title}
          </h1>
          {workspace.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {workspace.description}
            </p>
          ) : null}
        </div>

        <nav aria-label="Workspace tools" className="mt-8 grid gap-0.5">
          {WORKSPACE_MODES.map((item) => {
            const Icon = item.icon
            const active = item.id === mode
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-primary bg-muted font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>
                  <span>{item.label}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="w-full justify-start px-3" />
              }
            >
              <BoxesIcon />
              Workspace options
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilIcon />
                Edit workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon />
                Delete workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link href="/" aria-label="Back to workspaces" />}
              className="md:hidden"
            >
              <ArrowLeftIcon />
            </Button>
            <div className="md:hidden">
              <h1 className="truncate text-base font-semibold">
                {workspace.title}
              </h1>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold">{activeMode.label}</p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {CHAT_MODEL_LABELS[
                (workspace.defaultModel as ChatModel) ?? "gpt-4o-mini"
              ] ?? workspace.defaultModel}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" />}
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

        <nav
          aria-label="Workspace tools"
          className="flex shrink-0 gap-1 overflow-x-auto border-b bg-card/60 px-3 py-2 md:hidden"
        >
          {WORKSPACE_MODES.map((item) => {
            const Icon = item.icon
            const active = item.id === mode
            return (
              <Button
                key={item.id}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                onClick={() => setMode(item.id)}
                className="shrink-0"
              >
                <Icon /> {item.label}
              </Button>
            )
          })}
        </nav>

        <main className="min-h-0 flex-1 p-0">
          <section
            className="h-full min-h-0"
            aria-label={`${activeMode.label} workspace`}
          >
            <SourcesPanel
              workspaceId={workspace.id}
              className={cn("h-full", mode !== "sources" && "hidden")}
            />
            <ChatPanel
              workspace={workspace}
              className={cn("h-full", mode !== "chat" && "hidden")}
            />
            <StudioPanel
              workspaceId={workspace.id}
              className={cn("h-full", mode !== "studio" && "hidden")}
            />
          </section>
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
    </div>
  )
}
