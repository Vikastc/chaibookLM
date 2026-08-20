"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  BookOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Workspace } from "../types"

type WorkspaceCardProps = {
  workspace: Workspace
  onEdit: (workspace: Workspace) => void
  onDelete: (workspace: Workspace) => void
}

export function WorkspaceCard({
  workspace,
  onEdit,
  onDelete,
}: WorkspaceCardProps) {
  return (
    <Card className="group relative rounded-2xl ring-foreground/5 transition-all ring-inset hover:-translate-y-0.5 hover:bg-card hover:shadow-md hover:ring-foreground/10">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-xl leading-none">
          {workspace.icon ? (
            <span aria-hidden="true">{workspace.icon}</span>
          ) : (
            <BookOpenIcon className="size-4.5 text-accent-foreground" />
          )}
        </div>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                />
              }
            >
              <MoreHorizontalIcon />
              <span className="sr-only">Workspace actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(workspace)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(workspace)}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
        <CardTitle className="mt-1.5 line-clamp-1">
          {/* Stretched link: makes the whole card clickable while keeping the
              actions menu above it (z-10). */}
          <Link
            href={`/workspace/${workspace.id}`}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
          >
            {workspace.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">
          {workspace.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto text-xs text-muted-foreground">
        Edited{" "}
        {formatDistanceToNow(new Date(workspace.updatedAt), {
          addSuffix: true,
        })}
      </CardContent>
    </Card>
  )
}
