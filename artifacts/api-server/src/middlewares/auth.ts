import type { NextFunction, Request, Response } from "express";
import { getSession, getSessionId } from "../lib/auth.ts";
import type { PlannerIdentity } from "./authorization.ts";

export async function loadPlannerIdentity(req: Request, _res: Response, next: NextFunction) {
  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) req.plannerIdentity = session.user;
  }
  next();
}

export type { PlannerIdentity };