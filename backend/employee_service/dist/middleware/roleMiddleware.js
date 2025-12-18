"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated", success: false });
        }
        const userRole = req.user.role || "ADMIN";
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Access denied: insufficient permissions", success: false });
        }
        next();
    };
};
exports.requireRole = requireRole;
