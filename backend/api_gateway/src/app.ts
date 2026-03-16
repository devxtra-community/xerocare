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

/*
 * This is the main setup for the API Gateway.
 * Think of the Gateway as the "Front Door" of our system.
 * Every request from a user comes here first, and this door decides where to send it.
 */
const app: Express = express();

/**
 * Trust Proxy setup.
 * This tells our server that it's sitting behind another gatekeeper (like Nginx).
 * It helps our system correctly identify the real IP address of the person visiting.
 */
app.set('trust proxy', 1);

/**
 * Security: Allowed Websites (CORS)
 * This section defines which external websites or addresses are allowed to
 * communicate with our system. We only want our own trusted apps to talk to us.
 */
const CLIENT_URL = process.env.CLIENT_URL;
logger.info(`CORS configured for origin: ${CLIENT_URL}`);

const allowedOrigins = [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(
  Boolean,
) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
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

/**
 * Performance: Data Squashing (Compression)
 * This makes the information we send back to the user smaller,
 * which makes the app feel faster and saves data.
 */
app.use(compression());

/**
 * Activity Log: Record all incoming requests
 * This keeps a log of every time someone tries to talk to our server,
 * which is useful for debugging if something goes wrong.
 */
app.use(httpLogger);

/**
 * Health Check: A simple "Are you alive?" test.
 * This endpoint (/health) is used by our monitoring tools to make sure
 * the server is still running properly.
 */
app.use('/health', healthRouter);

/**
 * Welcome Route: The very base address.
 * Just a simple confirmation that the gateway is up and running.
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

/**
 * Invoice Management: Local Billing Routes
 * These routes handle financial documents (invoices).
 * We process these directly here at the gateway for convenience.
 */
app.use('/b/invoices', express.json(), invoiceRouter);

/**
 * Safety: Prevention of Automated Attacks (Rate Limiting)
 * We limit how many times someone can try to login or request a password reset
 * in a short period. This prevents hackers from trying thousands of passwords
 * automatically.
 */
app.post('/e/auth/login', loginLimiter);
app.post(
  ['/e/auth/login/verify', '/e/auth/forgot-password/verify', '/e/auth/magic-link/verify'],
  otpVerifyLimiter,
);
app.post(['/e/auth/forgot-password', '/e/auth/magic-link'], otpSendLimiter);

/**
 * Traffic Director: Sending requests to the right service.
 * This function creates a "tunnel" to another part of our system.
 * If a request comes in for employees, this tunnel sends it to the Employee Service.
 *
 * @param target - The address of the internal service we want to talk to.
 */
function createServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 60_000, // Wait up to 60 seconds for a response
    timeout: 60_000, // If nothing happens for 60 seconds, close the connection
    secure: false, // Trust our own internal network connections

    on: {
      // If the destination service is down or doesn't respond, we tell the user.
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

// These are the addresses for the different "departments" in our system.
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL as string;
const VENDOR_INVENTORY_SERVICE_URL = process.env.VENDOR_INVENTORY_SERVICE_URL as string;
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL as string;
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL as string;

/**
 * Pre-Flight Check: Ensure we know where everyone is.
 * Before starting, we make sure we have the addresses for all our internal services.
 */
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

/**
 * Routing Table: Mapping paths to services.
 * We tell the gateway:
 * - "/e" goes to Employees
 * - "/i" goes to Inventory
 * - "/b" goes to Billing
 * - "/c" goes to CRM (Customer Management)
 */
app.use('/e', createServiceProxy(EMPLOYEE_SERVICE_URL));
app.use('/i', createServiceProxy(VENDOR_INVENTORY_SERVICE_URL));
app.use('/b', createServiceProxy(BILLING_SERVICE_URL));
app.use('/c', createServiceProxy(CRM_SERVICE_URL));

/**
 * Universal Safety Net: Catch-all for errors.
 * If anything goes wrong anywhere in the gateway, this ensures we
 * send a clean error message back to the user instead of letting the app crash.
 */
app.use(errorHandler);

/**
 * Launch Sequence: Starting the engine.
 * This function connects to our message system (RabbitMQ) first,
 * then starts listening for users on the internet.
 */
async function startServer(): Promise<void> {
  const PORT = process.env.API_GATEWAY_PORT || process.env.PORT || 3001;

  // Let's make sure our internal communication channel is open.
  await startCustomerConsumer();
  logger.info('Customer consumer initialised');

  // Announce where we are sending traffic for debugging purposes.
  logger.info(`Proxying /e → ${EMPLOYEE_SERVICE_URL}`);
  logger.info(`Proxying /i → ${VENDOR_INVENTORY_SERVICE_URL}`);
  logger.info(`Proxying /b → ${BILLING_SERVICE_URL}`);
  logger.info(`Proxying /c → ${CRM_SERVICE_URL}`);

  // Start listening for incoming traffic.
  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
  });
}

// Fire up the server!
startServer().catch((err: Error) => {
  logger.error('Fatal error during API Gateway startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
