"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccesstoken = signAccesstoken;
exports.signRefreshtoken = signRefreshtoken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
function signAccesstoken(payload, expiresIn = "15m") {
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: expiresIn });
}
function signRefreshtoken(payload, expiresIn = "15d") {
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: expiresIn });
}
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
    }
    catch {
        return null;
    }
}
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
    }
    catch {
        return null;
    }
}
