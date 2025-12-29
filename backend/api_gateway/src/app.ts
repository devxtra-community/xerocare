import "./config/env";
import express, { Express } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Options } from "http-proxy-middleware";

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

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});