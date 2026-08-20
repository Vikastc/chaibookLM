"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
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
import { Spinner } from "@/components/ui/spinner"

import { useDeleteWorkspace } from "../hooks"
import type { Workspace } from "../types"

type DeleteWorkspaceDialogProps = {
  workspace: Workspace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful delete (e.g. to navigate away from the detail page). */
  onDeleted?: () => void
}

export function DeleteWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  onDeleted,
}: DeleteWorkspaceDialogProps) {
  const deleteMutation = useDeleteWorkspace()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!workspace) return
    setError(null)

    try {
      await deleteMutation.mutateAsync(workspace.id)
      toast.success(`Deleted "${workspace.title}"`)
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      )
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{workspace?.title}&rdquo; and all of its sources,
            conversations, and artifacts will be permanently deleted. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Spinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
