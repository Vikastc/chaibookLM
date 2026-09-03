import { prisma } from "./db.js";
import { QuotaExceededError } from "../types/errors.js";

/** Lifetime free token budget per user. Override via TOKEN_QUOTA_PER_USER env var. */
export const FREE_TOKEN_LIMIT = Number(
  process.env.TOKEN_QUOTA_PER_USER ?? 50_000,
);

/**
 * Throws {@link QuotaExceededError} if the user has exhausted their free token budget.
 * Call this before every AI generation call.
 *
 * @param userId - Authenticated user's id
 */
export async function checkQuota(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenUsage: true },
  });

  if (!user) return; // should never happen after requireAuth

  if (user.tokenUsage >= FREE_TOKEN_LIMIT) {
    throw new QuotaExceededError(user.tokenUsage, FREE_TOKEN_LIMIT);
  }
}

/**
 * Atomically increments a user's lifetime token usage counter.
 * Call this after every successful AI generation with the actual token count.
 *
 * @param userId - Authenticated user's id
 * @param tokens - Tokens consumed in this request (prompt + completion)
 */
export async function recordTokenUsage(
  userId: string,
  tokens?: number,
): Promise<void> {
  if (!tokens || tokens <= 0) return;
  await prisma.$executeRaw`
    UPDATE "user" SET "tokenUsage" = "tokenUsage" + ${tokens} WHERE "id" = ${userId}
  `;
}
