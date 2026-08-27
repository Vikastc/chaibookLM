/** Default chat model when the client or workspace does not specify one. */
export const CHAT_MODEL = "gpt-4o-mini";

/** Allowed chat models exposed to the client and workspace settings. */
export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

/** OpenAI embedding model used for RAG vector indexing and query embedding. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Vector dimension count — must match Pinecone index configuration. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Target max characters per text chunk during source processing. */
export const CHUNK_SIZE = 1000;

/** Character overlap between consecutive chunks at split boundaries. */
export const CHUNK_OVERLAP = 100;

/** Number of Pinecone chunks to retrieve per chat query. */
export const RAG_TOP_K = 6;

/**
 * Minimum cosine similarity score for a retrieved chunk to be included in context.
 *
 * NOTE: `text-embedding-3-small` produces much lower cosine similarities than older
 * embedding models — genuinely relevant matches typically land between 0.15 and 0.45.
 * A threshold higher than that silently filters out ALL chunks, which makes chat
 * answers claim they cannot see the sources. Tuned empirically: relevant passages
 * score >= ~0.15 while unrelated noise sits well below.
 */
export const RAG_MIN_SCORE = 0.15;


/** Enqueue a conversation summary job every N persisted messages. */
export const CONVERSATION_SUMMARY_INTERVAL = 8;

/** Max recent UI messages sent to the model when a rolling summary exists. */
export const RECENT_MESSAGE_WINDOW = 12;

/**
 * Sources left in PENDING/PROCESSING longer than this are assumed dead (a
 * worker restart or crash lost the event) and get marked FAILED by the reaper
 * cron job, surfacing a retryable state instead of an endless spinner.
 */
export const STALE_PROCESSING_MINUTES = 5;

