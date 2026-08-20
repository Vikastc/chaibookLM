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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type WorkspaceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog edits this workspace. Otherwise it creates one. */
  workspace?: Workspace
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit workspace" : "New workspace"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this workspace."
              : "A workspace groups sources, chats, and study material around one topic."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="workspace-title">Title</Label>
            <Input
              id="workspace-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Biology finals"
              maxLength={120}
              required
              autoFocus
              aria-invalid={!!error?.fieldError("title")}
            />
            {error?.fieldError("title") && (
              <p className="text-xs text-destructive">
                {error.fieldError("title")}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="workspace-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this workspace about?"
              maxLength={500}
              aria-invalid={!!error?.fieldError("description")}
            />
            {error?.fieldError("description") && (
              <p className="text-xs text-destructive">
                {error.fieldError("description")}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="workspace-icon">
              Icon{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="workspace-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="📚"
                maxLength={8}
                className="w-16 text-center"
                aria-invalid={!!error?.fieldError("icon")}
              />
              <div className="flex flex-wrap gap-1">
                {ICON_PRESETS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      "text-base",
                      icon === emoji && "bg-muted ring-1 ring-foreground/15"
                    )}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
            {error?.fieldError("icon") && (
              <p className="text-xs text-destructive">
                {error.fieldError("icon")}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="workspace-model">Default model</Label>
            <Select
              value={defaultModel}
              onValueChange={(value) => setDefaultModel(value as ChatModel)}
              items={CHAT_MODELS.map((model) => ({
                value: model,
                label: CHAT_MODEL_LABELS[model],
              }))}
            >
              <SelectTrigger id="workspace-model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {CHAT_MODEL_LABELS[model]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error?.fieldError("defaultModel") && (
              <p className="text-xs text-destructive">
                {error.fieldError("defaultModel")}
              </p>
            )}
          </div>

          {error && !error.details && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              disabled={isPending}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              {isEdit ? "Save changes" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
