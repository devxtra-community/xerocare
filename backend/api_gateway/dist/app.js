"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const health_1 = __importDefault(require("./routes/health"));
const customerUpdatedConsumer_1 = require("./events/consumers/customerUpdatedConsumer");
const invoiceRoutes_1 = __importDefault(require("./routes/invoiceRoutes"));
const httplogger_1 = require("./middleware/httplogger");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimitter_1 = require("./middleware/rateLimitter");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use(rateLimitter_1.globalRateLimiter);
(async () => {
    await (0, customerUpdatedConsumer_1.startCustomerConsumer)();
    logger_1.logger.info('Customer Consumer initialized');
})();
const PORT = process.env.PORT;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL;
const VENDOR_INVENTORY_SERVICE_URL = process.env.VENDOR_INVENTORY_SERVICE_URL;
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL;
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
logger_1.logger.info(`CORS Configured for origin: ${CLIENT_URL}`);
app.use((0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
}));
// Specific Rate Limits
app.post('/e/auth/login', rateLimitter_1.loginLimiter);
app.post(['/e/auth/login/verify', '/e/auth/forgot-password/verify', '/e/auth/magic-link/verify'], rateLimitter_1.otpVerifyLimiter);
app.post(['/e/auth/forgot-password', '/e/auth/magic-link'], rateLimitter_1.otpSendLimiter);
const empProxyOptions = {
    target: EMPLOYEE_SERVICE_URL,
    changeOrigin: true,
};
const invProxyOptions = {
    target: VENDOR_INVENTORY_SERVICE_URL,
    changeOrigin: true,
};
const billProxyOptions = {
    target: BILLING_SERVICE_URL,
    changeOrigin: true,
};
const crmProxyOptions = {
    target: CRM_SERVICE_URL,
    changeOrigin: true,
};
app.use(httplogger_1.httpLogger);
app.use('/health', health_1.default);
app.use('/b/invoices', express_1.default.json(), invoiceRoutes_1.default);
app.use('/e', (0, http_proxy_middleware_1.createProxyMiddleware)(empProxyOptions));
app.use('/i', (0, http_proxy_middleware_1.createProxyMiddleware)(invProxyOptions));
app.use('/b', (0, http_proxy_middleware_1.createProxyMiddleware)(billProxyOptions));
app.use('/c', (0, http_proxy_middleware_1.createProxyMiddleware)(crmProxyOptions));
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT} `);
});
