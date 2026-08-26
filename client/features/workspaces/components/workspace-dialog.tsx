"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

import { useCreateWorkspace, useUpdateWorkspace } from "../hooks"
import {
  CHAT_MODELS,
  CHAT_MODEL_LABELS,
  type ChatModel,
  type Workspace,
} from "../types"

const ICON_PRESETS = ["📚", "🧠", "💼", "🔬", "📊", "🎓", "💡", "📝"]

const MODEL_HINTS: Record<ChatModel, string> = {
  "gpt-4o-mini": "Fast, everyday",
  "gpt-4o": "Deeper answers",
}

type WorkspaceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog edits this workspace. Otherwise it creates one. */
  workspace?: Workspace
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
    >
      {children}
    </Label>
  )
}

export function WorkspaceDialog({
  open,
  onOpenChange,
  workspace,
}: WorkspaceDialogProps) {
  const isEdit = workspace !== undefined
  const createMutation = useCreateWorkspace()
  const updateMutation = useUpdateWorkspace(workspace?.id ?? "")
  const isPending = createMutation.isPending || updateMutation.isPending

  // Dialog content unmounts when closed, so this state resets on every open.
  const [title, setTitle] = useState(workspace?.title ?? "")
  const [description, setDescription] = useState(workspace?.description ?? "")
  const [icon, setIcon] = useState(workspace?.icon ?? "")
  const [defaultModel, setDefaultModel] = useState<ChatModel>(
    (workspace?.defaultModel as ChatModel | null) ?? "gpt-4o-mini"
  )
  const [error, setError] = useState<ApiError | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit) {
        // Send every field so cleared values ("") actually clear on the server.
        await updateMutation.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          icon: icon.trim(),
          defaultModel,
        })
        toast.success("Workspace updated")
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          ...(description.trim() && { description: description.trim() }),
          ...(icon.trim() && { icon: icon.trim() }),
          defaultModel,
        })
        toast.success("Workspace created")
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err)
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isEdit ? "Edit workspace" : "New workspace"}
          </DialogTitle>
          <DialogDescription>
            A home for one topic — its sources, chats, and study material.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Title — hero field */}
          <div className="grid gap-2">
            <Label htmlFor="workspace-title" className="sr-only">
              Title
            </Label>
            <Input
              id="workspace-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name your workspace"
              maxLength={120}
              required
              autoFocus
              aria-invalid={!!error?.fieldError("title")}
              className="h-12 rounded-xl border-transparent bg-muted/60 px-4 font-heading text-lg font-medium placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:border-border focus-visible:bg-card"
            />
            {error?.fieldError("title") && (
              <p className="text-sm text-destructive">
                {error.fieldError("title")}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <FieldLabel htmlFor="workspace-description">
              Description · optional
            </FieldLabel>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this workspace about?"
              maxLength={500}
              aria-invalid={!!error?.fieldError("description")}
              className="min-h-24 rounded-xl border-transparent bg-muted/60 px-4 py-3 text-base focus-visible:border-border focus-visible:bg-card"
            />
            {error?.fieldError("description") && (
              <p className="text-sm text-destructive">
                {error.fieldError("description")}
              </p>
            )}
          </div>

          {/* Icon — tile picker */}
          <div className="grid gap-2">
            <FieldLabel htmlFor="workspace-icon">Icon · optional</FieldLabel>
            <div className="flex flex-wrap items-center gap-1.5">
              {ICON_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(icon === emoji ? "" : emoji)}
                  aria-pressed={icon === emoji}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl text-xl transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    icon === emoji
                      ? "bg-accent ring-2 ring-primary/30"
                      : "hover:bg-muted"
                  )}
                >
                  {emoji}
                </button>
              ))}
              <Input
                id="workspace-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="✏️"
                maxLength={8}
                aria-label="Custom icon"
                aria-invalid={!!error?.fieldError("icon")}
                className="size-10 rounded-xl border-transparent bg-muted/60 p-0 text-center text-xl focus-visible:border-border focus-visible:bg-card"
              />
            </div>
            {error?.fieldError("icon") && (
              <p className="text-sm text-destructive">
                {error.fieldError("icon")}
              </p>
            )}
          </div>

          {/* Model — segmented control */}
          <div className="grid gap-2">
            <FieldLabel>Default model</FieldLabel>
            <div
              role="radiogroup"
              aria-label="Default model"
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            >
              {CHAT_MODELS.map((model) => (
                <button
                  key={model}
                  type="button"
                  role="radio"
                  aria-checked={defaultModel === model}
                  onClick={() => setDefaultModel(model)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    defaultModel === model
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-sm font-medium">
                    {CHAT_MODEL_LABELS[model]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {MODEL_HINTS[model]}
                  </span>
                </button>
              ))}
            </div>
            {error?.fieldError("defaultModel") && (
              <p className="text-sm text-destructive">
                {error.fieldError("defaultModel")}
              </p>
            )}
          </div>

          {error && !error.details && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <DialogFooter className="-mx-5 -mb-5">
            <DialogClose
              render={<Button variant="ghost" type="button" />}
              disabled={isPending}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending} className="px-4">
              {isPending && <Spinner />}
              {isEdit ? "Save changes" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
