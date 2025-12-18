"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const dataSource_1 = require("../config/dataSource");
const authEntities_1 = require("../entities/authEntities");
const employeeEntities_1 = require("../entities/employeeEntities");
const adminEntities_1 = require("../entities/adminEntities");
class AuthRepository {
    constructor() {
        this.authRepo = dataSource_1.Source.getRepository(authEntities_1.Auth);
    }
    async saveRefreshToken(user, refreshToken) {
        const auth = this.authRepo.create({
            employee: user instanceof employeeEntities_1.Employee ? user : null,
            admin: user instanceof adminEntities_1.Admin ? user : null,
            refresh_token: refreshToken
        });
        return this.authRepo.save(auth);
    }
    async findByToken(refreshToken) {
        return this.authRepo.findOne({
            where: { refresh_token: refreshToken },
            relations: ["employee", "admin"]
        });
    }
    async deleteToken(refreshToken) {
        return this.authRepo.delete({ refresh_token: refreshToken });
    }
}
exports.AuthRepository = AuthRepository;
