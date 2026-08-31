"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { formatDistanceToNow } from "date-fns"
import { HistoryIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { conversationKeys } from "@/lib/query-keys"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Panel, PanelHeader } from "@/components/panel"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHAT_MODEL_LABELS,
  type ChatModel,
  type Workspace,
} from "@/features/workspaces/types"
import { useConversations, useDeleteConversation } from "../hooks"
import { toUIMessages } from "../messages"
import type { Conversation } from "../types"
import { getConversationMessages } from "../api"
import { ChatComposer } from "./chat-composer"
import { ChatMessages } from "./chat-messages"
import { SourceDetailDialog } from "@/features/sources/components/source-detail-dialog"

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8080")

export function ChatPanel({
  workspace,
  className,
}: {
  workspace: Workspace
  className?: string
}) {
  const queryClient = useQueryClient()
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null)
  const [webSearch, setWebSearch] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null)
  const [citationSourceId, setCitationSourceId] = useState<string | null>(null)

  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: conversationKeys.lists(workspace.id),
    })
  }, [queryClient, workspace.id])

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${API_URL}/api/workspaces/${workspace.id}/conversations/messages`,
        credentials: "include",
        // New conversations are created implicitly by the server; the id is
        // returned via the `X-Conversation-Id` response header.
        fetch: async (input, init) => {
          const response = await fetch(input, init)
          const conversationId = response.headers.get("X-Conversation-Id")
          if (conversationId) setActiveConversationId(conversationId)
          return response
        },
      }),
    [workspace.id]
  )

  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    setMessages,
    clearError,
  } = useChat({
    transport,
    onFinish: invalidateLists,
    onError: (streamError) =>
      toast.error(
        streamError.message || "The assistant couldn't finish its reply."
      ),
  })

  const conversationsQuery = useConversations(workspace.id)
  const deleteMutation = useDeleteConversation(workspace.id)

  const busy = status === "submitted" || status === "streaming"
  const conversations = conversationsQuery.data ?? []
  const activeConversation =
    conversations.find((item) => item.id === activeConversationId) ?? null

  function requireIdle(): boolean {
    if (busy) {
      toast.info("Wait for the current reply to finish.")
      return false
    }
    return true
  }

  function handleSend(text: string) {
    void sendMessage(
      { text },
      {
        body: {
          ...(activeConversationId
            ? { conversationId: activeConversationId }
            : {}),
          ...(webSearch ? { webSearch: true } : {}),
        },
      }
    )
  }

  async function openConversation(conversation: Conversation) {
    if (!requireIdle()) return
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: conversationKeys.messages(workspace.id, conversation.id),
        queryFn: () => getConversationMessages(workspace.id, conversation.id),
      })
      setActiveConversationId(conversation.id)
      setMessages(toUIMessages(rows))
      clearError()
    } catch (loadError) {
      toast.error(
        loadError instanceof ApiError
          ? loadError.message
          : "Couldn't load the conversation."
      )
    }
  }

  function startNewConversation() {
    if (!messages.length && !activeConversationId && !error) return
    if (!requireIdle()) return
    setActiveConversationId(null)
    setMessages([])
    clearError()
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(`Deleted "${pendingDelete.title ?? "New chat"}"`)
      if (pendingDelete.id === activeConversationId) {
        setActiveConversationId(null)
        setMessages([])
        clearError()
      }
      setPendingDelete(null)
    } catch (deleteError) {
      toast.error(
        deleteError instanceof ApiError
          ? deleteError.message
          : "Couldn't delete the conversation."
      )
    }
  }

  return (
    <Panel className={cn("bg-card", className)}>
      <PanelHeader title="Chat">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {CHAT_MODEL_LABELS[
              (workspace.defaultModel as ChatModel) ?? "gpt-4o-mini"
            ] ?? workspace.defaultModel}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Conversation history"
                />
              }
            >
              <HistoryIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {conversationsQuery.isPending ? (
                <div className="grid gap-1.5 p-2">
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                conversations.map((conversation) => (
                  <DropdownMenuItem
                    key={conversation.id}
                    className="flex-col items-start gap-0.5"
                    onClick={() => void openConversation(conversation)}
                  >
                    <span className="max-w-full truncate text-sm font-medium">
                      {conversation.title ?? "New chat"}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {activeConversation ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete current conversation"
              onClick={() => setPendingDelete(activeConversation)}
            >
              <Trash2Icon />
            </Button>
          ) : null}
          <Button size="sm" onClick={startNewConversation}>
            <PlusIcon />
            New
          </Button>
        </div>
      </PanelHeader>

      {messages.length === 0 ? (
        <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
          <div className="flex max-w-md flex-col items-center">
            <span className="flex size-12 items-center justify-center rounded-full text-white shadow-xs bg-brand">
              <SparklesIcon className="size-5" />
            </span>
            <p className="mt-3 font-sans text-3xl font-semibold tracking-tight text-balance">
              Ask {workspace.title} anything
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Answers come with citations pointing back to your sources.
            </p>
          </div>
        </div>
      ) : (
        <ChatMessages
          messages={messages}
          status={status}
          onSelectSource={setCitationSourceId}
        />
      )}

      {error ? (
        <div className="mx-4 mb-3 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          <span className="truncate text-xs font-medium text-destructive">
            {error.message}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void regenerate({
                  body: {
                    ...(activeConversationId
                      ? { conversationId: activeConversationId }
                      : {}),
                    ...(webSearch ? { webSearch: true } : {}),
                  },
                })
              }
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <footer className="shrink-0 border-t bg-card/65 p-4 backdrop-blur-sm sm:p-5">
        <ChatComposer
          status={status}
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
          onSend={handleSend}
          onStop={() => {
            stop()
            invalidateLists()
          }}
        />
      </footer>

      <SourceDetailDialog
        workspaceId={workspace.id}
        sourceId={citationSourceId}
        open={citationSourceId !== null}
        onOpenChange={(open) => {
          if (!open) setCitationSourceId(null)
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.title ?? "New chat"}&quot; and all of its
              messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}
