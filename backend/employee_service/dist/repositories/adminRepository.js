"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepository = void 0;
const dataSource_1 = require("../config/dataSource");
const adminEntities_1 = require("../entities/adminEntities");
class AdminRepository {
    constructor() {
        this.repo = dataSource_1.Source.getRepository(adminEntities_1.Admin);
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
}
exports.AdminRepository = AdminRepository;
