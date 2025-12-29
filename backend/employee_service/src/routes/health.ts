import { Router } from "express";
import { healthCheck } from "../health/healthController";

const router = Router();

router.get("/health", async (_req, res) => {
  const result = await healthCheck();

  res
    .status(result.status === "UP" ? 200 : 503)
    .json(result);
});

export default router;
