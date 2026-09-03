import OpenAI from "openai";
import { ModerationError } from "../types/errors.js";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Runs the user's message through OpenAI's Moderation API before spending any tokens.
 * The moderation endpoint is FREE and does not count against the user's token quota.
 *
 * Throws {@link ModerationError} (400) when content is flagged, with the violated
 * categories in `details` so the client can surface a helpful message.
 *
 * @see https://platform.openai.com/docs/guides/moderation
 * @param text - The raw user message to screen
 */
export async function moderateInput(text: string): Promise<void> {
  if (!text.trim()) return;

  const result = await getClient().moderations.create({
    model: "omni-moderation-latest",
    input: text,
  });

  const output = result.results[0];
  if (!output) return;

  if (output.flagged) {
    const flaggedCategories = Object.entries(output.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category);

    throw new ModerationError(flaggedCategories);
  }
}
