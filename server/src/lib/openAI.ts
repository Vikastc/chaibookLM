import OpenAI from "openai";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "./aiConfig.js";

let client: OpenAI | null = null;

async function embedTextsWithGoogle(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini embedding failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    embeddings?: Array<{ values: number[] }>;
  };

  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error("Google embedding API returned empty embeddings");
  }

  return data.embeddings.map((e) => e.values);
}

async function embedTextsWithOpenAI(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured in .env");
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const provider = (process.env.EMBEDDING_PROVIDER || "").toLowerCase().trim();

  // 1. If provider is explicitly 'gemini', or not set but GEMINI_API_KEY is present
  if (provider === "gemini" || (!provider && process.env.GEMINI_API_KEY?.trim())) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "EMBEDDING_PROVIDER is set to 'gemini' but GEMINI_API_KEY is missing in .env (get a free key at aistudio.google.com)",
      );
    }
    return embedTextsWithGoogle(texts, apiKey);
  }

  // 2. If provider is explicitly 'openai', or default fallback
  if (provider === "openai" || (!provider && process.env.OPENAI_API_KEY?.trim())) {
    return embedTextsWithOpenAI(texts);
  }

  throw new Error(
    "No embedding provider configured. Set EMBEDDING_PROVIDER=gemini (with GEMINI_API_KEY) or EMBEDDING_PROVIDER=openai (with OPENAI_API_KEY) in .env",
  );
}

