import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import type { Session } from "../lib/session.js";

declare global {
  namespace Express {
    interface Request {
      session: Session;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.session = session;

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
