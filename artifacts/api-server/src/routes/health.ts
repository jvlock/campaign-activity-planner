import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse, ReadinessCheckResponse } from "@workspace/api-zod";
import { checkDatabaseReadiness } from "@workspace/db";

const router: IRouter = Router();

const liveness = (_req: Request, res: Response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

// The artifact router probes /api as well as the configured startup path.
// Neither liveness endpoint may wait for PostgreSQL or an external service.
router.get("/", liveness);
router.get("/healthz", liveness);

router.get("/readyz", async (_req, res): Promise<void> => {
  try {
    await checkDatabaseReadiness();
    res.json(ReadinessCheckResponse.parse({
      status: "ready",
      dependencies: { database: "ready" },
    }));
  } catch {
    res.status(503).json(ReadinessCheckResponse.parse({
      status: "not_ready",
      dependencies: { database: "unavailable" },
    }));
  }
});

export default router;
