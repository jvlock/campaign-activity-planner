import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import * as oidc from "openid-client";
import { authSessionsTable, db, usersTable } from "@workspace/db";
import type { PlannerIdentity } from "../middlewares/authorization.ts";

export const SESSION_COOKIE = "planner_sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
let config: oidc.Configuration | undefined;

export async function getOidcConfig() {
  config ??= await oidc.discovery(new URL(ISSUER_URL), process.env.REPL_ID!);
  return config;
}

export async function createSession(user: PlannerIdentity) {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(authSessionsTable).values({
    sid,
    user,
    expire: new Date(Date.now() + SESSION_TTL_MS),
  });
  return sid;
}

export async function getSession(sid: string) {
  const [session] = await db.select().from(authSessionsTable).where(eq(authSessionsTable.sid, sid));
  if (!session || session.expire <= new Date()) return null;
  return session;
}

export async function deleteSession(sid?: string) {
  if (sid) await db.delete(authSessionsTable).where(eq(authSessionsTable.sid, sid));
}

export function getSessionId(req: { headers: Record<string, unknown>; cookies?: Record<string, string> }) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

export async function upsertIdentity(claims: Record<string, unknown>): Promise<PlannerIdentity> {
  const externalId = String(claims.sub);
  const displayName = String(
    claims.name ?? [claims.first_name, claims.last_name].filter(Boolean).join(" ") ?? externalId,
  );
  const email = typeof claims.email === "string" ? claims.email : null;
  const [user] = await db.insert(usersTable).values({
    externalId,
    displayName,
    email,
    createdBy: externalId,
    updatedBy: externalId,
  }).onConflictDoUpdate({
    target: usersTable.externalId,
    set: { displayName, email, updatedBy: externalId, updatedAt: new Date() },
  }).returning();
  return { id: externalId, email: user.email, displayName: user.displayName };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS,
};