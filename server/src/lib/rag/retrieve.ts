import { RAG_MIN_SCORE, RAG_TOP_K } from "../aiConfig.js";
import { prisma } from "../db.js";
import { embedTexts } from "../openAI.js";
import { queryWorkspaceVectors } from "../pinecone.js";

export type RetrievedChunk = {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  chunkId: string;
  chunkIndex: number;
  page?: number;
  text: string;
  score: number;
};

export async function retrieveWorkspaceContext(
  workspaceId: string,
  query: string,
): Promise<RetrievedChunk[]> {
  const [embedding] = await embedTexts([query]);
  const matches = await queryWorkspaceVectors(
    workspaceId,
    embedding,
    RAG_TOP_K,
  );

  const chunks: RetrievedChunk[] = [];

  for (const match of matches) {
    const score = match.score ?? 0;
    if (score < RAG_MIN_SCORE) {
      continue;
    }

    const metadata = match.metadata as Record<string, unknown> | undefined;
    if (
      !metadata ||
      typeof metadata.sourceId !== "string" ||
      typeof metadata.sourceTitle !== "string" ||
      typeof metadata.sourceType !== "string" ||
      typeof metadata.chunkId !== "string" ||
      typeof metadata.text !== "string"
    ) {
      continue;
    }

    chunks.push({
      sourceId: metadata.sourceId,
      sourceTitle: metadata.sourceTitle,
      sourceType: metadata.sourceType,
      chunkId: metadata.chunkId,
      chunkIndex: Number(metadata.chunkIndex ?? 0),
      ...(typeof metadata.page === "number" ? { page: metadata.page } : {}),
      text: metadata.text,
      score,
    });
  }

  return chunks;
}

export type UserMemoryContext = string;

/** One processed source surfaced to the model as part of the workspace catalog. */
export type SourceOverviewItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  snippet: string;
};

const SOURCE_OVERVIEW_SNIPPET_CHARS = 400;
const SOURCE_OVERVIEW_MAX_SOURCES = 10;

/**
 * Lists the workspace's sources with a short excerpt each, including ones that
 * are still processing or failed.
 *
 * Used as a fallback context so the model can answer overview-style questions
 * ("what is my PDF about?") even when vector retrieval returns no chunks —
 * meta-questions have weak similarity to document *content* and often score
 * below any sane cutoff. Non-READY sources are included too, so the model can
 * honestly report "still processing" / "failed to process" instead of claiming
 * it cannot access a document.
 *
 * @param workspaceId - Workspace whose sources to summarize
 * @returns Up to ten sources ordered newest-first, or an empty list
 *
 */
export async function getWorkspaceSourceOverview(
  workspaceId: string,
): Promise<SourceOverviewItem[]> {
  const sources = await prisma.source.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      content: true,
    },
    orderBy: { createdAt: "desc" },
    take: SOURCE_OVERVIEW_MAX_SOURCES,
  });

  return sources.map((source) => ({
    id: source.id,
    title: source.title,
    type: source.type,
    status: source.status,
    snippet: (source.content ?? "")
      .trim()
      .slice(0, SOURCE_OVERVIEW_SNIPPET_CHARS),
  }));
}

export function buildConversationSystemPrompt(input: {
  chunks: RetrievedChunk[];
  conversationSummary?: string | null;
  userMemories?: UserMemoryContext[];
  webSearchEnabled?: boolean;
  sourceOverview?: SourceOverviewItem[];
}) {
  const sections: string[] = [
    "You are RAG Studio, an expert research assistant that helps users learn from their workspace sources.",
    // The chat UI renders assistant replies as plain text; Markdown symbols
    // like ### or ** would show up literally to the user.
    "Reply in plain text only. Do NOT use Markdown syntax: no '#' heading marks,",
    "no '*' or '**' emphasis/bullets, no '_' underscores for emphasis, and no",
    "backticks. For lists use simple '- ' dash lines or numbered lines like '1.'.",
    "Keep structure with short paragraphs instead of headings.",
  ];

  if (input.webSearchEnabled) {
    sections.push(
      "You have access to a web_search tool for up-to-date information outside the workspace.",
      "Use it when the user asks about recent events or topics not covered by their sources.",
      "Cite web results inline using [W1], [W2], etc. matching the web result blocks.",
    );
  }

  if (input.userMemories?.length) {
    const memoryBlock = input.userMemories
      .map((memory) => `- ${memory}`)
      .join("\n");

    sections.push(
      "Personal notes about this user (preferences, goals, context they chose to save).",
      "Use them for tone and relevance only — they are NOT workspace sources:",
      "never present them as document content or cite them like [1].",
      memoryBlock,
    );
  }

  const summary = input.conversationSummary?.trim();
  if (summary) {
    sections.push("Earlier conversation summary:", summary);
  }

  if (input.chunks.length === 0) {
    const overview = (input.sourceOverview ?? []).filter(
      (source) => source.title.trim().length > 0,
    );

    if (overview.length > 0) {
      const catalog = overview
        .map((source, index) => {
          const statusLabel =
            source.status === "READY"
              ? ""
              : ` [status: ${source.status.toLowerCase()}]`;
          return `[S${index + 1}] ${source.title} (${source.type})${statusLabel}: ${source.snippet || "(no text preview available)"}`;
        })
        .join("\n");

      sections.push(
        "No specific passages were retrieved for this question, but the workspace DOES contain these sources:",
        catalog,
        "",
        "Use the titles and previews above to answer overview-style questions such as",
        '"what is my PDF about?" or "what sources do I have?" — describe what the',
        "documents cover based on their titles and opening content.",
        "Do NOT claim you cannot access the sources.",
        'If a source is marked with a non-"ready" status, tell the user it is still',
        "processing (or failed) rather than pretending it does not exist.",
        "For deeper factual claims beyond the previews, say the user should ask a more",
        "specific question about that source. Do not invent citations like [1] since no",
        "numbered context blocks were retrieved this turn.",
      );
      return sections.join("\n");
    }

    sections.push(
      "This workspace has no indexed source content yet, or nothing relevant was retrieved.",
      input.webSearchEnabled
        ? "Use web search when needed, or answer from general knowledge."
        : "Answer helpfully from general knowledge and suggest adding or processing sources when appropriate.",
      "Do not invent citations.",
    );
    return sections.join("\n");
  }

  const context = input.chunks
    .map((chunk, index) => {
      const label = `[${index + 1}] ${chunk.sourceTitle} (${chunk.sourceType})${
        chunk.page ? `, page ${chunk.page}` : ""
      }`;
      return `${label}\n${chunk.text}`;
    })
    .join("\n\n");

  sections.push(
    "Use ONLY the retrieved context below when making factual claims about their materials.",
    "If the context is insufficient, say so clearly.",
    "Citation rules (follow strictly):",
    "- Ground every factual claim in the numbered context blocks.",
    "- Immediately after each claim, add its marker like [1] or [2] matching the block.",
    "- Multiple blocks may be cited together, e.g. [1][3].",
    "- Never invent block numbers; only use the numbers listed under 'Retrieved context:'.",
    "Keep answers concise, accurate, and educational.",
    "",
    "Retrieved context:",
    context,
  );

  return sections.join("\n");
}
