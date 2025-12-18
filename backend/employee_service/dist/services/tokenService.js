"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueTokens = issueTokens;
const jwt_1 = require("../utlis/jwt");
const authRepository_1 = require("../repositories/authRepository");
const authRepo = new authRepository_1.AuthRepository();
async function issueTokens(user, res) {
    const accessToken = (0, jwt_1.signAccesstoken)({
        id: user.id,
        email: user.email,
        role: user.role,
    });
    const refreshToken = (0, jwt_1.signRefreshtoken)({ id: user.id });
    await authRepo.saveRefreshToken(user, refreshToken);
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 15 * 24 * 60 * 60 * 1000,
    });
    return { accessToken, refreshToken };
}
