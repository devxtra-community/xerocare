"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogout = exports.adminLogin = void 0;
const adminService_1 = require("../services/adminService");
const authService_1 = require("../services/authService");
const tokenService_1 = require("../services/tokenService");
const adminService = new adminService_1.AdminService();
const authService = new authService_1.AuthService();
const adminLogin = async (req, res) => {
    try {
        const { admin } = await adminService.login(req.body);
        const accessToken = await (0, tokenService_1.issueTokens)(admin, res);
        return res.json({
            message: "Admin login successfully",
            accessToken,
            data: admin,
            success: true
        });
    }
    catch (err) {
        return res.status(500).json({ message: err.message, success: false });
    }
};
exports.adminLogin = adminLogin;
const adminLogout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        await authService.logout(refreshToken);
        res.clearCookie("refreshToken");
        res.json({ message: "Admin logout successful", success: true });
    }
    catch (err) {
        return res.status(500).json({
            message: err.message || "Internal server error",
            success: false,
        });
    }
};
exports.adminLogout = adminLogout;
