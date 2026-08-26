import { openai } from "@ai-sdk/openai";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";
import {
  convertToModelMessages,
  createUIMessageStream,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { z } from "zod";
import {
  CHAT_MODEL,
  CHAT_MODELS,
  CONVERSATION_SUMMARY_INTERVAL,
  RECENT_MESSAGE_WINDOW,
} from "../lib/aiConfig.js";
import { enqueueConversationSummarize } from "../lib/conversationEvents.js";
import { addMemoriesFromMessages, searchUserMemories } from "../lib/mem0.js";
import {
  buildConversationSystemPrompt,
  retrieveWorkspaceContext,
} from "../lib/rag/retrieve.js";
import {
  formatTavilyResultsForPrompt,
  searchWeb,
  type TavilySearchResponse,
} from "../lib/tavily.js";
import { NotFoundError, ValidationError } from "../types/errors.js";
import {
  buildConversationTitle,
  getLastUserMessageText,
  getTextFromUIMessage,
} from "../utils/uiMessage.js";
import {
  countMessagesByConversationId,
  createMessageRecord,
  findMessagesByConversationId,
} from "./messageService.js";
import { getWorkspaceByIdForUser } from "./workspaceService.js";

export const conversationSelect = {
  id: true,
  workspaceId: true,
  title: true,
  summary: true,
  summaryMessageCount: true,
  summarizedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ConversationRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationSelect;
}>;

export function findConversationById(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: conversationSelect,
  });
}

export function findConversationByIdAndWorkspaceId(
  conversationId: string,
  workspaceId: string,
) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: conversationSelect,
  });
}

export function createConversationRecord(workspaceId: string, title?: string) {
  return prisma.conversation.create({
    data: {
      workspaceId,
      title: title ?? null,
    },
    select: conversationSelect,
  });
}

export function updateConversationSummary(
  conversationId: string,
  data: {
    summary: string;
    summaryMessageCount: number;
  },
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      summary: data.summary,
      summaryMessageCount: data.summaryMessageCount,
      summarizedAt: new Date(),
    },
    select: conversationSelect,
  });
}

export function updateConversationRecord(
  conversationId: string,
  data: { title?: string | null },
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data,
    select: conversationSelect,
  });
}

export function touchConversation(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
    select: conversationSelect,
  });
}

export async function deleteConversationRecord(conversationId: string) {
  await prisma.conversation.delete({
    where: { id: conversationId },
  });
}

export type StreamWorkspaceConversationInput = {
  conversationId?: string;
  messages: UIMessage[];
  model?: string;
  webSearch?: boolean;
};

export type StreamWorkspaceConversationResult = {
  conversationId: string;
  stream: ReadableStream<UIMessageChunk>;
};

/**
 * Lists all conversations in a workspace for the sidebar/history UI.
 *
 * @param workspaceId - Workspace to list conversations from
 * @param userId - Authenticated user's id
 * @returns Conversation records ordered by most recent activity
 *
 */
export async function listConversationsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);
  return prisma.conversation.findMany({
    where: { workspaceId },
    select: conversationSelect,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Creates an empty conversation (optional title).
 *
 * Most conversations are created implicitly on first message via {@link streamWorkspaceConversation};
 * this supports explicit "new conversation" actions from the UI.
 *
 * @param workspaceId - Workspace to attach the conversation to
 * @param userId - Authenticated user's id
 * @param title - Optional display title
 * @returns New conversation record
 *
 */
export async function createConversationForWorkspace(
  workspaceId: string,
  userId: string,
  title?: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);
  return createConversationRecord(workspaceId, title);
}

/**
 * Loads persisted message history for a conversation.
 *
 * @param workspaceId - Workspace the conversation belongs to
 * @param conversationId - Conversation to load messages for
 * @param userId - Authenticated user's id
 * @returns Message rows with role, content, citations, and timestamps
 * @throws {NotFoundError} When the conversation does not exist in this workspace
 *
 */
export async function getConversationMessagesForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const conversation = await findConversationByIdAndWorkspaceId(
    conversationId,
    workspaceId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  return findMessagesByConversationId(conversationId);
}

/**
 * Deletes a conversation and all its messages (cascade).
 *
 * @param workspaceId - Workspace the conversation belongs to
 * @param conversationId - Conversation to delete
 * @param userId - Authenticated user's id
 * @returns Resolves when the conversation row is deleted
 * @throws {NotFoundError} When the conversation does not exist
 *
 */
export async function deleteConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const conversation = await findConversationByIdAndWorkspaceId(
    conversationId,
    workspaceId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  await deleteConversationRecord(conversationId);
}

/**
 * Finds an existing conversation or creates one from the first user message.
 *
 * @param workspaceId - Workspace scope
 * @param conversationId - Existing id from client, or undefined for a new conversation
 * @param firstMessage - User text used to auto-generate a title for new conversations
 * @returns Conversation record (existing or newly created)
 * @throws {NotFoundError} When `conversationId` is provided but not found
 *
 */
async function resolveConversation(
  workspaceId: string,
  conversationId: string | undefined,
  firstMessage: string,
) {
  if (conversationId) {
    const existing = await findConversationByIdAndWorkspaceId(
      conversationId,
      workspaceId,
    );

    if (!existing) {
      throw new NotFoundError("Conversation not found");
    }

    return existing;
  }

  return createConversationRecord(
    workspaceId,
    buildConversationTitle(firstMessage),
  );
}

/**
 * Runs the RAG conversation pipeline and returns a UI message stream for the reply.
 *
 * **Pipeline:**
 * 1. Resolve model and validate user message
 * 2. Resolve/create conversation and persist the user message
 * 3. Parallel: Pinecone RAG retrieval + Mem0 memory search
 * 4. Build system prompt and stream model response via AI SDK
 * 5. On finish: save assistant message, citations, title, summary job, Mem0 learning
 *
 * @param workspaceId - Workspace whose sources to search
 * @param userId - Authenticated user's id
 * @param input - Client conversation payload from `useChat`
 * @returns Conversation id (for the `X-Conversation-Id` header) and UI message stream
 * @throws {ValidationError} When no user message text is present
 * @throws {NotFoundError} When conversation or workspace is not found
 *
 */
export async function streamWorkspaceConversation(
  workspaceId: string,
  userId: string,
  input: StreamWorkspaceConversationInput,
): Promise<StreamWorkspaceConversationResult> {
  const workspace = await getWorkspaceByIdForUser(workspaceId, userId);
  const requestedModel = input.model ?? workspace.defaultModel;
  const chatModel =
    CHAT_MODELS.find((model) => model === requestedModel) ?? CHAT_MODEL;
  const webSearchEnabled =
    input.webSearch === true && !!process.env.TAVILY_API_KEY?.trim();

  const userText = getLastUserMessageText(input.messages);
  if (!userText) {
    throw new ValidationError("A user message is required");
  }

  const conversation = await resolveConversation(
    workspaceId,
    input.conversationId,
    userText,
  );

  await createMessageRecord({
    conversationId: conversation.id,
    role: "USER",
    content: userText,
  });

  const [retrievedChunks, userMemories] = await Promise.all([
    retrieveWorkspaceContext(workspaceId, userText),
    searchUserMemories(userId, userText),
  ]);

  const citations = retrievedChunks.map((chunk) => ({
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    sourceType: chunk.sourceType,
    chunkId: chunk.chunkId,
    chunkIndex: chunk.chunkIndex,
    page: chunk.page,
    excerpt: chunk.text.slice(0, 280),
    score: chunk.score,
  }));
  const systemPrompt = buildConversationSystemPrompt({
    chunks: retrievedChunks,
    conversationSummary: conversation.summary,
    userMemories: userMemories.map((memory) => memory.memory),
    webSearchEnabled,
  });

  const contextMessages =
    conversation.summary && input.messages.length > RECENT_MESSAGE_WINDOW
      ? input.messages.slice(-RECENT_MESSAGE_WINDOW)
      : input.messages;

  let webSearchResults: TavilySearchResponse | null = null;

  const stream = createUIMessageStream({
    originalMessages: input.messages,
    execute: async ({ writer }) => {
      const tools = webSearchEnabled
        ? {
            web_search: tool({
              description:
                "Search the web for up-to-date information outside the workspace sources.",
              inputSchema: z.object({
                query: z
                  .string()
                  .describe("The search query for current web information"),
              }),
              execute: async ({ query }) => {
                const results = await searchWeb(query);
                webSearchResults = results;
                return formatTavilyResultsForPrompt(results);
              },
            }),
          }
        : undefined;

      const result = streamText({
        model: openai(chatModel),
        system: systemPrompt,
        messages: await convertToModelMessages(contextMessages),
        tools,
        stopWhen: webSearchEnabled ? isStepCount(3) : undefined,
      });

      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted) {
        return;
      }

      const assistantText = getTextFromUIMessage(responseMessage).trim();
      if (!assistantText) {
        return;
      }

      const webCitations = webSearchResults
        ? webSearchResults.results.map((result) => ({
            sourceType: "WEB" as const,
            sourceTitle: result.title,
            url: result.url,
            excerpt: result.content.slice(0, 280),
          }))
        : [];
      const allCitations = [...citations, ...webCitations];

      await createMessageRecord({
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: assistantText,
        citations: allCitations,
      });

      await touchConversation(conversation.id);

      if (!conversation.title) {
        await updateConversationRecord(conversation.id, {
          title: buildConversationTitle(userText),
        });
      }

      const messageCount = await countMessagesByConversationId(conversation.id);

      if (messageCount % CONVERSATION_SUMMARY_INTERVAL === 0) {
        await enqueueConversationSummarize({
          conversationId: conversation.id,
          userId,
        });
      }

      void addMemoriesFromMessages(
        userId,
        [
          { role: "user", content: userText },
          { role: "assistant", content: assistantText },
        ],
        {
          source: "learned",
          conversationId: conversation.id,
        },
      ).catch((error: unknown) => {
        console.error("Mem0 add failed:", error);
      });
    },
  });

  return {
    conversationId: conversation.id,
    stream,
  };
}
