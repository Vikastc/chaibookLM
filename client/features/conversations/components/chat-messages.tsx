"use client"

import type { ChatStatus, UIMessage } from "ai"
import { BookOpenIcon, GlobeIcon } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent, MessageGroup } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import { Spinner } from "@/components/ui/spinner"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

import { getMessageCitations, getMessageText } from "../messages"
import type { MessageCitation } from "../types"

type ChatMessagesProps = {
  messages: UIMessage[]
  status: ChatStatus
  onSelectSource?: (sourceId: string) => void
}

function cleanInline(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*{1,3})([^*]+?)\1/g, "$2")
    .replace(/_{1,2}([^_]+?)_{1,2}/g, "$1")
}

function AssistantText({ text }: { text: string }) {
  return (
    <div className="grid gap-2.5 text-[15px] leading-7 sm:text-base">
      {text.split("\n").map((line, index) => {
        const value = line.trim().replace(/^\\(?=#{1,6}\s)/, "")
        if (!value) return <div key={index} className="h-1" />
        const heading = value.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
          return (
            <h3
              key={index}
              className="mt-4 font-sans text-lg leading-snug font-semibold tracking-tight"
            >
              {cleanInline(heading[2]!)}
            </h3>
          )
        }
        const bullet = value.match(/^[-*]\s+(.*)$/)
        if (bullet) {
          return (
            <p key={index} className="flex gap-3">
              <span
                className="mt-3 size-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              {cleanInline(bullet[1]!)}
            </p>
          )
        }
        const numbered = value.match(/^(\d+)[.)]\s+(.*)$/)
        if (numbered) {
          return (
            <p key={index} className="flex gap-3">
              <span className="min-w-5 font-semibold text-primary">
                {numbered[1]}.
              </span>
              {cleanInline(numbered[2]!)}
            </p>
          )
        }
        return <p key={index}>{cleanInline(value)}</p>
      })}
    </div>
  )
}

function CitationRow({
  citation,
  onSelectSource,
}: {
  citation: MessageCitation
  onSelectSource?: (sourceId: string) => void
}) {
  const isWeb = citation.sourceType === "WEB"
  const label = (
    <>
      {isWeb ? <GlobeIcon /> : <BookOpenIcon />}
      <span className="truncate">
        {citation.sourceTitle ?? citation.url ?? "Source"}
        {citation.page ? ` · p.${citation.page}` : ""}
      </span>
    </>
  )
  const props = {
    className:
      "grid min-w-0 gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    children: (
      <>
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
          {label}
        </span>
        {citation.excerpt ? (
          <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {citation.excerpt}
          </span>
        ) : null}
      </>
    ),
  }

  // Web citations open the external URL in a new tab.
  if (isWeb && citation.url) {
    return <a href={citation.url} target="_blank" rel="noreferrer" {...props} />
  }

  // Workspace citations open the source's detail view.
  if (citation.sourceId && onSelectSource) {
    return (
      <button
        type="button"
        onClick={() => onSelectSource(citation.sourceId!)}
        {...props}
      />
    )
  }

  return <span {...props} />
}

function SourcesPill({
  citations,
  onSelectSource,
}: {
  citations: MessageCitation[]
  onSelectSource?: (sourceId: string) => void
}) {
  const webCount = citations.filter(
    (citation) => citation.sourceType === "WEB"
  ).length
  const label = webCount
    ? `Web search · ${webCount}`
    : `Sources · ${citations.length}`
  const description = webCount
    ? "Web sources used in this answer"
    : "Workspace sources used in this answer"

  return (
    <HoverCard>
      <HoverCardTrigger
        href="#sources"
        onClick={(event) => event.preventDefault()}
        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {webCount ? (
          <GlobeIcon className="size-3.5" />
        ) : (
          <BookOpenIcon className="size-3.5" />
        )}
        {label}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] p-3"
      >
        <p className="px-1 pb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {description}
        </p>
        <div className="grid max-h-72 gap-0.5 overflow-y-auto">
          {citations.map((citation, index) => (
            <CitationRow
              key={`${citation.sourceId ?? citation.url ?? "source"}-${index}`}
              citation={citation}
              onSelectSource={onSelectSource}
            />
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function ChatMessages({
  messages,
  status,
  onSelectSource,
}: ChatMessagesProps) {
  const isStreaming = status === "streaming"
  const lastMessage = messages[messages.length - 1]
  const isWaitingForReply =
    status === "submitted" && lastMessage?.role === "user"

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport aria-label="Conversation messages">
          <MessageScrollerContent className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
            {messages.map((message) => {
              const isUser = message.role === "user"
              const text = getMessageText(message)
              const citations = isUser
                ? undefined
                : getMessageCitations(message)
              const isActiveResponse = message.id === lastMessage?.id
              const isThinking =
                !isUser && status === "submitted" && isActiveResponse && !text

              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor
                >
                  <MessageGroup>
                    <Message align={isUser ? "end" : "start"}>
                      <MessageContent>
                        {isUser ? (
                          <Bubble align="end">
                            <BubbleContent className="max-w-2xl rounded-2xl px-5 py-3.5 text-[15px] leading-7 whitespace-pre-wrap sm:text-base">
                              {text}
                            </BubbleContent>
                          </Bubble>
                        ) : isThinking ? (
                          <span className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                            <Spinner className="size-3.5" />
                            Preparing an answer…
                          </span>
                        ) : (
                          <div className="max-w-3xl min-w-0">
                            <AssistantText text={text} />
                            <span className="sr-only">
                              {!isUser &&
                                isStreaming &&
                                isActiveResponse &&
                                "Writing answer"}
                            </span>
                            {!isUser && isStreaming && isActiveResponse && (
                              <span
                                aria-hidden="true"
                                className="mt-3 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle"
                              />
                            )}
                            {citations?.length ? (
                              <div className="mt-5">
                                <SourcesPill
                                  citations={citations}
                                  onSelectSource={onSelectSource}
                                />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              )
            })}
            {isWaitingForReply ? (
              <MessageScrollerItem messageId="pending-response" scrollAnchor>
                <MessageGroup>
                  <Message align="start">
                    <MessageContent>
                      <span className="inline-flex items-center gap-2 rounded-xl border bg-muted/55 px-3.5 py-2.5 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Searching your sources…
                      </span>
                    </MessageContent>
                  </Message>
                </MessageGroup>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
