"use client"

import { useRef, useState } from "react"
import type { ChatStatus } from "ai"
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ChatComposerProps = {
  status: ChatStatus
  webSearch: boolean
  onWebSearchChange: (enabled: boolean) => void
  onSend: (text: string) => void
  onStop: () => void
}

const MAX_TEXTAREA_HEIGHT_PX = 160

export function ChatComposer({
  status,
  webSearch,
  onWebSearchChange,
  onSend,
  onStop,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const busy = status === "submitted" || status === "streaming"
  const canSend = value.trim().length > 0 && !busy

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
      className="flex flex-col gap-1 rounded-[1.25rem] border bg-muted/50 p-2 transition-colors focus-within:bg-card"
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
        placeholder="Ask anything about your sources…"
        aria-label="Message input"
        className="max-h-40 min-h-9 resize-none bg-transparent px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-pressed={webSearch}
          aria-label="Toggle web search"
          title={webSearch ? "Web search enabled" : "Search the web"}
          className={cn(webSearch && "bg-accent text-accent-foreground")}
          onClick={() => onWebSearchChange(!webSearch)}
        >
          <GlobeIcon />
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