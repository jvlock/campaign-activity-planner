import type { CorsOptions } from "cors";

export function trustedPlannerOrigins(env: NodeJS.ProcessEnv = process.env) {
  return new Set(
    [
      ...(env.PLANNER_ALLOWED_ORIGINS ?? "").split(","),
      ...(env.REPLIT_DOMAINS ?? "").split(",").map((host) => host ? `https://${host}` : ""),
      env.REPLIT_DEV_DOMAIN ? `https://${env.REPLIT_DEV_DOMAIN}` : "",
    ].map((origin) => origin.trim()).filter(Boolean),
  );
}

export function isTrustedPlannerOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  return !origin || trustedPlannerOrigins(env).has(origin);
}

export const plannerCorsOptions: CorsOptions = {
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
  origin(origin, callback) {
    callback(null, isTrustedPlannerOrigin(origin));
  },
};