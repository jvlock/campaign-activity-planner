import { Router, type IRouter, type Request } from "express";
import * as oidc from "openid-client";
import {
  createSession,
  deleteSession,
  getOidcConfig,
  getSessionId,
  sessionCookieOptions,
  SESSION_COOKIE,
  upsertIdentity,
} from "../lib/auth.ts";

const router: IRouter = Router();
const oidcCookie = { ...sessionCookieOptions, maxAge: 10 * 60 * 1000 };

function safeReturnTo(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function requestOrigin(req: Request) {
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  const host = req.header("x-forwarded-host") ?? req.header("host");
  if (!host) throw new Error("Request host is unavailable");
  return `${proto}://${host}`;
}

router.get("/auth/user", (req, res) => {
  res.json({ user: req.plannerIdentity ?? null });
});

router.get("/login", async (req, res) => {
  const config = await getOidcConfig();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  res.cookie("planner_verifier", verifier, oidcCookie);
  res.cookie("planner_state", state, oidcCookie);
  res.cookie("planner_nonce", nonce, oidcCookie);
  res.cookie("planner_return_to", safeReturnTo(req.query.returnTo), oidcCookie);
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${requestOrigin(req)}/api/callback`,
    scope: "openid email profile offline_access",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
  res.redirect(url.href);
});

router.get("/callback", async (req, res) => {
  const verifier = req.cookies?.planner_verifier;
  const state = req.cookies?.planner_state;
  const nonce = req.cookies?.planner_nonce;
  if (!verifier || !state) { res.redirect("/api/login"); return; }
  const currentUrl = new URL(req.originalUrl, requestOrigin(req));
  const tokens = await oidc.authorizationCodeGrant(await getOidcConfig(), currentUrl, {
    pkceCodeVerifier: verifier,
    expectedState: state,
    expectedNonce: nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims?.sub) { res.status(401).json({ error: "Authenticated identity missing" }); return; }
  const identity = await upsertIdentity(claims as unknown as Record<string, unknown>);
  const sid = await createSession(identity);
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
  for (const name of ["planner_verifier", "planner_state", "planner_nonce", "planner_return_to"]) {
    res.clearCookie(name, { path: "/" });
  }
  res.redirect(safeReturnTo(req.cookies?.planner_return_to));
});

router.get("/logout", async (req, res) => {
  await deleteSession(getSessionId(req));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.redirect(safeReturnTo(req.query.returnTo));
});

export default router;