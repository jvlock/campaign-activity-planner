import type { NextFunction, Request, Response } from "express";
import { isTrustedPlannerOrigin } from "../lib/cors.ts";

export interface PlannerIdentity {
  id: string;
  email: string | null;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      plannerIdentity?: PlannerIdentity;
    }
  }
}

export function isPlannerWriter(identity: PlannerIdentity): boolean {
  const authorized = new Set(
    [process.env.REPL_OWNER_ID, ...(process.env.PLANNER_WRITER_IDS ?? "").split(",")]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return authorized.has(identity.id);
}

export function requirePlannerWrite(req: Request, res: Response, next: NextFunction) {
  if (!req.plannerIdentity) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!isPlannerWriter(req.plannerIdentity)) {
    res.status(403).json({ error: "Planner write permission required" });
    return;
  }
  const usesBearerSession = req.header("authorization")?.startsWith("Bearer ") ?? false;
  if (!usesBearerSession) {
    const origin = req.header("origin");
    if (!origin || !isTrustedPlannerOrigin(origin)) {
      res.status(403).json({ error: "Trusted planner origin required" });
      return;
    }
  }
  next();
}