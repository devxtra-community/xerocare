"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeRepository = void 0;
const dataSource_1 = require("../config/dataSource");
const employeeEntities_1 = require("../entities/employeeEntities");
class EmployeeRepository {
    constructor() {
        this.repo = dataSource_1.Source.getRepository(employeeEntities_1.Employee);
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async createEmployee(data) {
        const employee = this.repo.create(data);
        return this.repo.save(employee);
    }
    async updatePassword(userId, passwordHash) {
        return this.repo.update(userId, {
            password_hash: passwordHash
        });
    }
}
exports.EmployeeRepository = EmployeeRepository;
