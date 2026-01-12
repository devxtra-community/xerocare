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
const httplogger_1 = require("./middleware/httplogger");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// app.use(express.json());
const PORT = process.env.PORT || 3001;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const VENDOR_INVENTORY_SERVICE_URL = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
const empProxyOptions = {
    target: EMPLOYEE_SERVICE_URL,
    changeOrigin: true,
};
const invProxyOptions = {
    target: VENDOR_INVENTORY_SERVICE_URL,
    changeOrigin: true,
};
app.use(httplogger_1.httpLogger);
app.use('/health', health_1.default);
app.use('/e', (0, http_proxy_middleware_1.createProxyMiddleware)(empProxyOptions));
app.use('/i', (0, http_proxy_middleware_1.createProxyMiddleware)(invProxyOptions));
app.use((err, req, res, next) => {
    logger_1.logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
    logger_1.logger.info(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});
