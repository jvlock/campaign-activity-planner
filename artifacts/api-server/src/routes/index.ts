import { Router, type IRouter } from "express";
import healthRouter from "./health";
import planningRouter from "./planning";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(planningRouter);

export default router;
