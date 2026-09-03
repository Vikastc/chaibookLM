"use client"

import { useRef, useState } from "react"
import type { ChatStatus } from "ai"
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ChatComposerProps = {
  status: ChatStatus
  webSearch: boolean
  disabled?: boolean
  onWebSearchChange: (enabled: boolean) => void
  onSend: (text: string) => void
  onStop: () => void
}

const MAX_TEXTAREA_HEIGHT_PX = 160

export function ChatComposer({
  status,
  webSearch,
  disabled = false,
  onWebSearchChange,
  onSend,
  onStop,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const busy = status === "submitted" || status === "streaming"
  const canSend = value.trim().length > 0 && !busy && !disabled

  function autoResize() {
    const element = textareaRef.current
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }

  function submit() {
    const text = value.trim()
    if (!text || busy) return
    onSend(text)
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = ""
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="mx-auto flex w-full max-w-4xl flex-col gap-1 rounded-lg border bg-card p-2.5 transition-colors focus-within:border-primary/60"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          autoResize()
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            submit()
          }
        }}
        placeholder={
          disabled
            ? "Free token limit reached"
            : "Ask a question about your sources"
        }
        disabled={disabled}
        aria-label="Message input"
        className="max-h-40 min-h-11 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
      />
      <div className="flex items-center justify-between gap-2 border-t px-1.5 pt-1.5">
        <Button
          type="button"
          variant={webSearch ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={webSearch}
          aria-label={webSearch ? "Disable web search" : "Enable web search"}
          title={
            webSearch
              ? "Web search is on"
              : "Search your workspace sources only"
          }
          className={cn(
            "rounded-full px-3 text-xs",
            webSearch
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground"
          )}
          onClick={() => onWebSearchChange(!webSearch)}
        >
          <GlobeIcon />
          <span>Web search</span>
          <span className="hidden text-[10px] font-semibold tracking-wide sm:inline">
            {webSearch ? "ON" : "OFF"}
          </span>
        </Button>
        {busy ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="rounded-full"
            aria-label="Stop generating"
            onClick={onStop}
          >
            <SquareIcon className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            className="rounded-full"
            aria-label="Send message"
            disabled={!canSend}
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
