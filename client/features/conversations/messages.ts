import type { UIMessage } from "ai"

import type { ConversationMessage, MessageCitation } from "./types"

type ConversationMessageMetadata = {
  citations?: MessageCitation[]
}

/** Reads the citation list attached to a persisted assistant message. */
export function getMessageCitations(
  message: UIMessage
): MessageCitation[] | undefined {
  const metadata = message.metadata as
    | ConversationMessageMetadata
    | undefined
  return metadata?.citations
}

/** Joins all text parts of a UI message into its display text. */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

/**
 * Maps persisted conversation messages into the AI SDK `UIMessage` shape so
 * history can be hydrated into `useChat`. Citations travel along in the
 * message metadata.
 */
export function toUIMessages(messages: ConversationMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    parts: [{ type: "text", text: message.content }],
    ...(message.citations?.length
      ? { metadata: { citations: message.citations } }
      : {}),
  }))
}