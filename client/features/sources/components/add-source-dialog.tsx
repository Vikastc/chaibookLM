"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlignLeftIcon,
  FileTextIcon,
  GlobeIcon,
  TvMinimalPlayIcon,
  UploadCloudIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

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

import {
  useCreateTextSource,
  useImportWebsite,
  useImportYoutube,
  useUploadPdf,
} from "../hooks"
import { useUserQuota } from "@/hooks/use-user-quota"
import { QuotaBanner } from "@/features/conversations/components/quota-banner"

// Vercel Functions accept request bodies up to 4.5 MB. Leave room for
// multipart form data so the published app has a dependable upload limit.
const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024

type SourceKind = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT"

const KIND_META: Record<
  SourceKind,
  { icon: LucideIcon; label: string; hint: string }
> = {
  PDF: { icon: FileTextIcon, label: "PDF", hint: "Upload a document" },
  WEBSITE: { icon: GlobeIcon, label: "Website", hint: "Import a page" },
  YOUTUBE: {
    icon: TvMinimalPlayIcon,
    label: "YouTube",
    hint: "Import a video",
  },
  TEXT: { icon: AlignLeftIcon, label: "Text", hint: "Paste or write" },
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fieldClass =
  "rounded-xl border-transparent bg-muted/60 focus-visible:border-border focus-visible:bg-card"

export function AddSourceDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [kind, setKind] = useState<SourceKind>("PDF")
  const { data: userQuota } = useUserQuota()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Add a source
          </DialogTitle>
          <DialogDescription>
            Answers in this workspace will be grounded in what you add here.
          </DialogDescription>
        </DialogHeader>

        {userQuota?.isExhausted ? <QuotaBanner className="mb-1" /> : null}

        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(KIND_META) as SourceKind[]).map((key) => {
            const { icon: Icon, label } = KIND_META[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setKind(key)}
                aria-pressed={kind === key}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  kind === key
                    ? "border-primary/40 bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )
          })}
        </div>

        {kind === "PDF" && (
          <PdfForm workspaceId={workspaceId} onOpenChange={onOpenChange} />
        )}
        {kind === "WEBSITE" && (
          <UrlForm
            workspaceId={workspaceId}
            kind="WEBSITE"
            onOpenChange={onOpenChange}
          />
        )}
        {kind === "YOUTUBE" && (
          <UrlForm
            workspaceId={workspaceId}
            kind="YOUTUBE"
            onOpenChange={onOpenChange}
          />
        )}
        {kind === "TEXT" && (
          <TextForm workspaceId={workspaceId} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof ApiError
        ? error.message
        : "Something went wrong. Please try again."}
    </p>
  )
}

function PdfForm({
  workspaceId,
  onOpenChange,
}: {
  workspaceId: string
  onOpenChange: (open: boolean) => void
}) {
  const uploadMutation = useUploadPdf(workspaceId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pickFile(candidate: File | null | undefined) {
    if (!candidate) return
    if (candidate.type !== "application/pdf") {
      setError("Only PDF files are supported.")
      return
    }
    if (candidate.size > MAX_PDF_SIZE_BYTES) {
      setError("PDFs up to 4 MB are supported.")
      return
    }
    setError(null)
    setFile(candidate)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError("Choose a PDF first.")
      return
    }
    setError(null)
    try {
      await uploadMutation.mutateAsync({ file, title })
      toast.success(`Uploaded "${file.name}" — processing started`)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Upload failed. Try again."
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => pickFile(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          pickFile(event.dataTransfer.files?.[0])
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          isDragging ? "border-primary/50 bg-accent/60" : "hover:bg-muted/60"
        )}
      >
        <UploadCloudIcon className="size-6 text-muted-foreground" />
        {file ? (
          <span className="text-sm font-medium">
            {file.name}{" "}
            <span className="text-muted-foreground">
              ({formatBytes(file.size)})
            </span>
          </span>
        ) : (
          <>
            <span className="text-sm font-medium">
              Drop a PDF here, or click to browse
            </span>
            <span className="text-xs text-muted-foreground">Up to 4 MB</span>
          </>
        )}
      </button>

      {file && (
        <div className="grid gap-2">
          <Label
            htmlFor="pdf-title"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Title · optional
          </Label>
          <Input
            id="pdf-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={file.name.replace(/\.pdf$/i, "")}
            maxLength={200}
            className={fieldClass}
          />
        </div>
      )}

      <FormError error={error} />
      {uploadMutation.isError && <FormError error={uploadMutation.error} />}

      <DialogFooter className="-mx-5 -mb-5">
        {file && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFile(null)}
            disabled={uploadMutation.isPending}
          >
            <XIcon />
            Clear
          </Button>
        )}
        <Button type="submit" disabled={!file || uploadMutation.isPending}>
          {uploadMutation.isPending && <Spinner />}
          {uploadMutation.isPending ? "Uploading…" : "Upload PDF"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function UrlForm({
  workspaceId,
  kind,
  onOpenChange,
}: {
  workspaceId: string
  kind: "WEBSITE" | "YOUTUBE"
  onOpenChange: (open: boolean) => void
}) {
  const websiteMutation = useImportWebsite(workspaceId)
  const youtubeMutation = useImportYoutube(workspaceId)
  const mutation = kind === "WEBSITE" ? websiteMutation : youtubeMutation

  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  const meta = KIND_META[kind]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const source = await mutation.mutateAsync({
        url: url.trim(),
        ...(title.trim() && { title: title.trim() }),
      })
      toast.success(`Added "${source.title}" — processing started`)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't import that link. Check the URL and try again."
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label
          htmlFor={`${kind}-url`}
          className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >
          {meta.label} URL
        </Label>
        <Input
          id={`${kind}-url`}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={
            kind === "WEBSITE"
              ? "https://example.com/article"
              : "https://www.youtube.com/watch?v=…"
          }
          required
          autoFocus
          className={fieldClass}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {kind === "WEBSITE"
            ? "We'll fetch and read the page — this can take a few seconds."
            : "We'll pull the transcript — this can take a few seconds."}
        </p>
      </div>

      <div className="grid gap-2">
        <Label
          htmlFor={`${kind}-title`}
          className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >
          Title · optional
        </Label>
        <Input
          id={`${kind}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Leave blank to use the page title"
          maxLength={200}
          className={fieldClass}
        />
      </div>

      <FormError error={error} />

      <DialogFooter className="-mx-5 -mb-5">
        <DialogClose
          render={<Button variant="ghost" type="button" />}
          disabled={mutation.isPending}
        >
          Cancel
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {mutation.isPending ? "Importing…" : `Import ${meta.label}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

function TextForm({
  workspaceId,
  onOpenChange,
}: {
  workspaceId: string
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateTextSource(workspaceId)
  const [format, setFormat] = useState<"TEXT" | "MARKDOWN">("TEXT")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const source = await createMutation.mutateAsync({
        type: format,
        title: title.trim(),
        content: content.trim(),
      })
      toast.success(`Added "${source.title}" — processing started`)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't add the source."
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label
          htmlFor="text-title"
          className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >
          Title
        </Label>
        <Input
          id="text-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Lecture notes — week 4"
          maxLength={200}
          required
          autoFocus
          className={fieldClass}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="text-content"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Content
          </Label>
          <div
            role="radiogroup"
            aria-label="Format"
            className="flex gap-1 rounded-lg bg-muted p-0.5"
          >
            {(["TEXT", "MARKDOWN"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={format === option}
                onClick={() => setFormat(option)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  format === option
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option === "TEXT" ? "Plain text" : "Markdown"}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id="text-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste or write the content here…"
          required
          className={cn("min-h-40 px-4 py-3 text-base", fieldClass)}
        />
      </div>

      <FormError error={error} />

      <DialogFooter className="-mx-5 -mb-5">
        <DialogClose
          render={<Button variant="ghost" type="button" />}
          disabled={createMutation.isPending}
        >
          Cancel
        </DialogClose>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <Spinner />}
          Add source
        </Button>
      </DialogFooter>
    </form>
  )
}
