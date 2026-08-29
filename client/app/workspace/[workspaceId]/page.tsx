"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  BookOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
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
import { StudioPanel } from "@/features/artifacts/components/studio-panel"
import { ChatPanel } from "@/features/conversations/components/chat-panel"
import { SourcesPanel } from "@/features/sources/components/sources-panel"
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/delete-workspace-dialog"
import { WorkspaceDialog } from "@/features/workspaces/components/workspace-dialog"
import { useWorkspace } from "@/features/workspaces/hooks"
import {
  CHAT_MODEL_LABELS,
  type ChatModel,
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
    <div className="flex h-svh flex-col bg-muted/40">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/" aria-label="Back to workspaces" />}
          >
            <ArrowLeftIcon />
          </Button>
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-lg leading-none">
            {workspace.icon ? (
              <span aria-hidden="true">{workspace.icon}</span>
            ) : (
              <BookOpenIcon className="size-4 text-accent-foreground" />
            )}
          </span>
          <h1 className="truncate font-heading text-lg font-medium tracking-tight">
            {workspace.title}
          </h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {CHAT_MODEL_LABELS[
              (workspace.defaultModel as ChatModel) ?? "gpt-4o-mini"
            ] ?? workspace.defaultModel}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
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

      <main className="grid flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <SourcesPanel workspaceId={workspace.id} />
        <ChatPanel workspace={workspace} />
        <StudioPanel workspaceId={workspace.id} />
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
