import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

/**
 * Resolve the acting user from the x-user-id header (anonymous-first identity:
 * no signup needed to learn — hard rule 4). Clerk-authenticated users are
 * linked by clerkId when a Clerk JWT integration is configured.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.header('x-user-id');
  if (!userId) {
    res.status(401).json({ error: 'missing x-user-id header — call POST /api/session/anon first' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(401).json({ error: 'unknown user' });
    return;
  }
  req.userId = user.id;
  // streak bookkeeping: a new calendar day of activity extends the streak
  const last = user.lastActive;
  const now = new Date();
  const dayMs = 86_400_000;
  const lastDay = Math.floor(last.getTime() / dayMs);
  const today = Math.floor(now.getTime() / dayMs);
  if (today !== lastDay) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActive: now,
        streakDays: today - lastDay === 1 ? user.streakDays + 1 : 1,
      },
    });
  }
  next();
}

/** Human-in-the-loop admin gate for verification routes. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-admin-key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'invalid admin key' });
    return;
  }
  next();
}
