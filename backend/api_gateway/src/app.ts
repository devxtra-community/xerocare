import "./config/env";
import express, { Express } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Options } from "http-proxy-middleware";
import healthRouter from "./routes/health"
import { httpLogger } from "./middleware/httplogger";
import { logger } from "./config/logger";

const app: Express = express();
// app.use(express.json());

const PORT = process.env.PORT || 3001;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || "http://localhost:3002";

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

const proxyOptions: Options = {
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
};
app.use(httpLogger)
app.use("/",healthRouter)
app.use('/', createProxyMiddleware(proxyOptions));

app.use((err: any, req: any, res: any, next: any) => {
  logger.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});