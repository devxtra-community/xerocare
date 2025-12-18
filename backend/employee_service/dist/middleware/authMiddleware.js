"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utlis/jwt");
const authMiddleware = (req, res, next) => {
    const token = req.headers?.authorization?.split(" ")[1];
    console.log(req.headers);
    if (!token) {
        return res.status(401).json({ message: "No access token", success: false });
    }
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    if (!decoded) {
        return res.status(401).json({ message: "Invalid access token", success: false });
    }
    req.user = decoded;
    next();
};
exports.authMiddleware = authMiddleware;
