"use client"

import type { ChatStatus, UIMessage } from "ai"
import { BookOpenIcon, GlobeIcon } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Message,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import { Badge, badgeVariants } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

import { getMessageCitations, getMessageText } from "../messages"
import type { MessageCitation } from "../types"

type ChatMessagesProps = {
  messages: UIMessage[]
  status: ChatStatus
  onSelectSource?: (sourceId: string) => void
}

function CitationChip({
  citation,
  onSelectSource,
}: {
  citation: MessageCitation
  onSelectSource?: (sourceId: string) => void
}) {
  const isWeb = citation.sourceType === "WEB"
  const title = citation.excerpt
    ? `${citation.sourceTitle ?? "Source"}${citation.page ? `, page ${citation.page}` : ""}: ${citation.excerpt}`
    : undefined
  const content = (
    <>
      {isWeb ? <GlobeIcon /> : <BookOpenIcon />}
      <span className="truncate">
        {citation.sourceTitle ?? citation.url ?? "Source"}
        {citation.page ? ` · p.${citation.page}` : ""}
      </span>
    </>
  )
  const className = cn(badgeVariants({ variant: "outline" }), "max-w-56 gap-1 font-normal")
  const props = { title, className, children: content }

  // Web citations open the external URL in a new tab.
  if (isWeb && citation.url) {
    return (
      <a href={citation.url} target="_blank" rel="noreferrer" {...props} />
    )
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

  return <Badge {...props} />
}

export function ChatMessages({
  messages,
  status,
  onSelectSource,
}: ChatMessagesProps) {
  const isStreaming = status === "streaming"
  const lastMessage = messages[messages.length - 1]

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport aria-label="Conversation messages">
          <MessageScrollerContent className="px-5 py-6">
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
                            <BubbleContent className="whitespace-pre-wrap">
                              {text}
                            </BubbleContent>
                          </Bubble>
                        ) : isThinking ? (
                          <span className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                            <Spinner className="size-3.5" />
                            Thinking…
                          </span>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {text}
                              {!isUser && isStreaming && isActiveResponse && (
                                <span
                                  aria-hidden="true"
                                  className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground align-middle"
                                />
                              )}
                            </p>
                            {citations?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {citations.map((citation, index) => (
                                  <CitationChip
                                    key={`${message.id}-citation-${index}`}
                                    citation={citation}
                                    onSelectSource={onSelectSource}
                                  />
                                ))}
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
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}