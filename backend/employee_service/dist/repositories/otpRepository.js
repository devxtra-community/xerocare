"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpRepository = void 0;
const dataSource_1 = require("../config/dataSource");
const otpEntities_1 = require("../entities/otpEntities");
class OtpRepository {
    constructor() {
        this.repo = dataSource_1.Source.getRepository(otpEntities_1.Otp);
    }
    async createOtp(data) {
        const otp = this.repo.create(data);
        return this.repo.save(otp);
    }
    async findLatest(email, purpose) {
        return this.repo.findOne({
            where: { email, purpose, is_used: false },
            order: { createdAt: "DESC" }
        });
    }
    async markUsed(id) {
        return this.repo.update(id, { is_used: true });
    }
}
exports.OtpRepository = OtpRepository;
