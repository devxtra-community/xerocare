"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.logout = exports.refresh = exports.loginVerify = exports.login = void 0;
const authService_1 = require("../services/authService");
const tokenService_1 = require("../services/tokenService");
const otpService_1 = require("../services/otpService");
const otpPurpose_1 = require("../constants/otpPurpose");
const authService = new authService_1.AuthService();
const otpService = new otpService_1.OtpService();
const login = async (req, res) => {
    try {
        const { user } = await authService.login(req.body);
        await otpService.sendOtp(user.email, otpPurpose_1.OtpPurpose.LOGIN);
        return res.json({
            message: "Otp sent to registered email",
            success: true,
        });
    }
    catch (err) {
        return res.status(500).json({ message: err.message, success: false });
    }
};
exports.login = login;
const loginVerify = async (req, res) => {
    try {
        const email = req.body.email.toLowerCase().trim();
        const otp = req.body.otp.trim();
        await otpService.verifyOtp(email, otp, otpPurpose_1.OtpPurpose.LOGIN);
        const user = await authService.findUserByEmail(email);
        const accessToken = await (0, tokenService_1.issueTokens)(user, res);
        return res.json({
            message: "Login successfull",
            accessToken,
            data: user,
            success: true,
        });
    }
    catch (err) {
        return res.status(400).json({
            message: err.message,
            success: false,
        });
    }
};
exports.loginVerify = loginVerify;
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new Error("No refresh token");
        }
        const user = await authService.refresh(refreshToken);
        const accessToken = await (0, tokenService_1.issueTokens)(user, res);
        return res.json({
            message: "Access token refreshed",
            accessToken,
            success: true,
        });
    }
    catch (err) {
        return res.status(401).json({
            message: err.message || "Invalid refresh token",
            success: false,
        });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        console.log(refreshToken);
        await authService.logout(refreshToken);
        res.clearCookie("refreshToken");
        res.json({ message: "logout successfull", success: true });
    }
    catch (err) {
        return res.status(500).json({
            message: err.message || "Internal server error",
            success: false,
        });
    }
};
exports.logout = logout;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword({
            userId,
            currentPassword,
            newPassword,
        });
        return res
            .status(200)
            .json({ message: "Password changed successfully", success: true });
    }
    catch (err) {
        return res.status(500).json({
            message: err.message || "Internal server error",
            success: false,
        });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email.toLowerCase().trim();
        const user = await authService.findUserByEmail(email);
        if (!user) {
            return res.json({
                message: "No Account exist for corresponding mail",
                success: true,
            });
        }
        await otpService.sendOtp(email, otpPurpose_1.OtpPurpose.FORGOT_PASSWORD);
        return res.json({
            message: "6 digit otp has been send to your email",
            success: true,
        });
    }
    catch (err) {
        return res.status(400).json({
            message: err.message,
            success: false,
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const email = req.body.email.toLowerCase().trim();
        const otp = String(req.body.otp).trim();
        const { newPassword } = req.body;
        await otpService.verifyOtp(email, otp, otpPurpose_1.OtpPurpose.FORGOT_PASSWORD);
        const user = await authService.findUserByEmail(email);
        await authService.resetPassword(user.id, newPassword);
        return res.json({
            message: "Password reset successfully",
            success: true,
        });
    }
    catch (err) {
        return res.status(400).json({
            message: err.message,
            success: false,
        });
    }
};
exports.resetPassword = resetPassword;
