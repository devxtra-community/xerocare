import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "api_gateway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
