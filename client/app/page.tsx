"use client"

import { useMemo, useState } from "react"
import { PlusIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"

import { useRequireAuth } from "@/hooks/use-require-auth"
import { UserMenu } from "@/components/auth/user-menu"
import { Wordmark } from "@/components/brand"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/ui/mode-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/delete-workspace-dialog"
import { WorkspaceCard } from "@/features/workspaces/components/workspace-card"
import { WorkspaceDialog } from "@/features/workspaces/components/workspace-dialog"
import { WorkspacesEmptyState } from "@/features/workspaces/components/workspaces-empty-state"
import { useWorkspaces } from "@/features/workspaces/hooks"
import type { Workspace } from "@/features/workspaces/types"

type DialogState = { mode: "create" } | { mode: "edit"; workspace: Workspace }
type SortMode = "recent" | "name" | "created"

const SORT_ITEMS = [
  { value: "recent", label: "Recent activity" },
  { value: "name", label: "Name A–Z" },
  { value: "created", label: "Date created" },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function Page() {
  const { session, isPending } = useRequireAuth()

  if (isPending || !session) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return <Dashboard user={session.user} />
}

function Dashboard({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const {
    data: workspaces,
    isPending,
    isError,
    error,
    refetch,
  } = useWorkspaces()
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortMode>("recent")

  const visible = useMemo(() => {
    if (!workspaces) return []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? workspaces.filter(
          (w) =>
            w.title.toLowerCase().includes(q) ||
            (w.description ?? "").toLowerCase().includes(q)
        )
      : workspaces
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title)
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [workspaces, query, sort])

  const firstName = user.name?.trim().split(/\s+/)[0]
  const hasWorkspaces = (workspaces?.length ?? 0) > 0

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-background px-6">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ModeToggle />
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          Pick up where you left off, or start something new.
        </p>

        {isPending ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-center">
            <TriangleAlertIcon className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Couldn't load workspaces."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !hasWorkspaces ? (
          <WorkspacesEmptyState
            onCreate={() => setDialog({ mode: "create" })}
          />
        ) : (
          <>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workspaces"
                  className="rounded-full bg-card pl-9"
                />
              </div>
              <div className="ml-auto">
                <Select
                  value={sort}
                  onValueChange={(value) => setSort(value as SortMode)}
                  items={SORT_ITEMS}
                >
                  <SelectTrigger className="w-40 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="mt-24 flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium">
                  Nothing matches &ldquo;{query.trim()}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  Try a different name or description.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CreateWorkspaceCard
                  onCreate={() => setDialog({ mode: "create" })}
                />
                {visible.map((workspace) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onEdit={(target) =>
                      setDialog({ mode: "edit", workspace: target })
                    }
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <WorkspaceDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        workspace={dialog?.mode === "edit" ? dialog.workspace : undefined}
      />
      <DeleteWorkspaceDialog
        workspace={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </div>
  )
}

function CreateWorkspaceCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="group flex min-h-44 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border text-center transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white shadow-xs transition-transform group-hover:scale-105">
        <PlusIcon className="size-5" />
      </span>
      <span className="text-sm font-medium">New workspace</span>
      <span className="max-w-48 text-xs leading-relaxed text-muted-foreground">
        Start with a topic, a course, or a project
      </span>
    </button>
  )
}
