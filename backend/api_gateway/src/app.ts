import express, { Express } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import "./config/env";

const app: Express = express();
const PORT = process.env.PORT || 8000;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3001';

app.use(cors(
    {
        origin:process.env.CLIENT_URL,
        credentials:true
    }
));

// Proxy routes to employee_service
app.use(
    ['/auth', '/employee', '/admin'],
    createProxyMiddleware({
        target: EMPLOYEE_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: {
        },
    })
);

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});