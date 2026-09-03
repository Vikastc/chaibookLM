import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { FREE_TOKEN_LIMIT } from "../lib/quota.js";
import { prisma } from "../lib/db.js";

export const userRouter = Router();

userRouter.use(requireAuth);

/**
 * GET /api/user/quota
 * Returns the authenticated user's lifetime token usage and free tier limit.
 */
userRouter.get("/quota", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.user.id },
    select: { tokenUsage: true },
  });

  const usage = user?.tokenUsage ?? 0;

  res.json({
    usage,
    limit: FREE_TOKEN_LIMIT,
    isExhausted: usage >= FREE_TOKEN_LIMIT,
  });
});
