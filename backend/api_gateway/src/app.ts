import './config/env';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import healthRouter from './routes/health';
import { startCustomerConsumer } from './events/consumers/customerUpdatedConsumer';
import invoiceRouter from './routes/invoiceRoutes';
import { httpLogger } from './middleware/httplogger';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { otpSendLimiter, otpVerifyLimiter, loginLimiter } from './middleware/rateLimitter';

// ---------------------------------------------------------------------------
// App instance
// ---------------------------------------------------------------------------
const app: Express = express();

// ---------------------------------------------------------------------------
// Trust proxy — required when running behind Nginx / Dokploy reverse proxy
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const CLIENT_URL = process.env.CLIENT_URL;
logger.info(`CORS configured for origin: ${CLIENT_URL}`);

const allowedOrigins = [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(
  Boolean,
) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://xerocare.apps.mastrovia.com')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Compression — reduces response sizes for API/JSON payloads
// ---------------------------------------------------------------------------
app.use(compression());

// ---------------------------------------------------------------------------
// HTTP request/response logger
// ---------------------------------------------------------------------------
app.use(httpLogger);

// ---------------------------------------------------------------------------
// Health route — handled entirely by the gateway, no upstream dependency
// ---------------------------------------------------------------------------
app.use('/health', healthRouter);

// ---------------------------------------------------------------------------
// Root route — useful for deployment health checks in Dokploy
// ---------------------------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

// ---------------------------------------------------------------------------
// Gateway-level invoice route (handled locally, not proxied).
// express.json() is added explicitly here as a defensive measure in case
// the global body parser order ever changes.
// ---------------------------------------------------------------------------
app.use('/b/invoices', express.json(), invoiceRouter);

// ---------------------------------------------------------------------------
// Specific rate limiters — applied only to the exact auth endpoints.
// Intentionally NOT applying a global limiter before proxy routes to avoid
// interfering with proxied upstream responses.
// ---------------------------------------------------------------------------
app.post('/e/auth/login', loginLimiter);
app.post(
  ['/e/auth/login/verify', '/e/auth/forgot-password/verify', '/e/auth/magic-link/verify'],
  otpVerifyLimiter,
);
app.post(['/e/auth/forgot-password', '/e/auth/magic-link'], otpSendLimiter);

// ---------------------------------------------------------------------------
// Proxy factory — creates a production-safe proxy with:
//   • 60 s timeout on both the socket and the proxy connection
//   • changeOrigin so Host header matches the upstream service
//   • onError hook that returns a clean 502 JSON instead of crashing
// ---------------------------------------------------------------------------
function createServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 60_000, // max ms to wait for upstream to respond
    timeout: 60_000, // socket inactivity timeout
    secure: false, // allow self-signed certs in internal network

    // Graceful error handler — prevents raw ECONNREFUSED / ECONNRESET from
    // bubbling up as an unformatted 500. Returns a clean 502 JSON message.
    // In http-proxy-middleware v3, event handlers live inside `on: {}`.
    // `res` is typed as Socket | ServerResponse | Response, so we use `any`
    // and guard with `headersSent` before writing (Socket won't have it).
    on: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error(err: Error, req: Request, res: any) {
        logger.error(`Proxy error → ${target}: ${err.message}`, {
          target,
          url: req.url,
          error: err.message,
        });

        if (res && typeof res.headersSent !== 'undefined' && !res.headersSent) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable' }));
        }
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Service URLs
// ---------------------------------------------------------------------------
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL as string;
const VENDOR_INVENTORY_SERVICE_URL = process.env.VENDOR_INVENTORY_SERVICE_URL as string;
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL as string;
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL as string;

// ---------------------------------------------------------------------------
// Env validation — fail fast before registering any proxy routes
// ---------------------------------------------------------------------------
const requiredEnvVars: Record<string, string> = {
  EMPLOYEE_SERVICE_URL,
  VENDOR_INVENTORY_SERVICE_URL,
  BILLING_SERVICE_URL,
  CRM_SERVICE_URL,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// ---------------------------------------------------------------------------
// Service proxies
// ---------------------------------------------------------------------------
app.use('/e', createServiceProxy(EMPLOYEE_SERVICE_URL));
app.use('/i', createServiceProxy(VENDOR_INVENTORY_SERVICE_URL));
app.use('/b', createServiceProxy(BILLING_SERVICE_URL));
app.use('/c', createServiceProxy(CRM_SERVICE_URL));

// ---------------------------------------------------------------------------
// Global error handler — catches errors thrown by gateway-level routes
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Async bootstrap — ensures the RabbitMQ consumer is fully initialised
// before the HTTP server begins accepting requests.
// ---------------------------------------------------------------------------
async function startServer(): Promise<void> {
  const PORT = process.env.API_GATEWAY_PORT || process.env.PORT || 3001;

  // Wait for the customer consumer to connect to RabbitMQ before opening
  // the server socket. This prevents a race condition at Docker startup where
  // the gateway starts routing requests before its workers are ready.
  await startCustomerConsumer();
  logger.info('Customer consumer initialised');

  // Log the proxy routing table for easy debugging in Dokploy / Docker logs
  logger.info(`Proxying /e → ${EMPLOYEE_SERVICE_URL}`);
  logger.info(`Proxying /i → ${VENDOR_INVENTORY_SERVICE_URL}`);
  logger.info(`Proxying /b → ${BILLING_SERVICE_URL}`);
  logger.info(`Proxying /c → ${CRM_SERVICE_URL}`);

  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
  });
}

// Start the server and surface any fatal startup errors
startServer().catch((err: Error) => {
  logger.error('Fatal error during API Gateway startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
