import "./config/env";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Filter, Options, RequestHandler } from "http-proxy-middleware";
import { IncomingMessage, ServerResponse, ClientRequest } from "http";
import { Socket } from "net";

const app: Express = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || "http://localhost:3002";

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use((req, res, next) => {
  console.log("request reached here at gateway");
  console.log("request from:", req.headers.origin);
  console.log("request to : ",req.originalUrl)
  next();
});

const proxyOptions: Options = {
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,

  on: {
    proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
      console.log(
        `[API GATEWAY] → Forwarding ${req.method} ${req.url} → ${EMPLOYEE_SERVICE_URL}`
      );
    },
    proxyRes: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => {
      console.log(
        `[API GATEWAY] ← Response ${proxyRes.statusCode} for ${req.method} ${req.url}`
      );
    },
    error: (err: Error, req: IncomingMessage, res: ServerResponse | Socket) => {
      console.error(`[PROXY ERROR] ${req.method} ${req.url}`, err);
      if (res instanceof ServerResponse && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Bad Gateway" }));
      }
    }
  }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});