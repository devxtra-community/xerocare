"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
require("./config/env");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3000';
app.use((0, cors_1.default)());
// Proxy routes to employee_service
app.use(['/auth', '/employee', '/admin'], (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: EMPLOYEE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
    // Keep paths as is, matching employee_service routes
    },
}));
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});
