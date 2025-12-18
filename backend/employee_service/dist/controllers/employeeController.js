"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEmployee = void 0;
const employeeService_1 = require("../services/employeeService");
const service = new employeeService_1.EmployeeService();
const addEmployee = async (req, res) => {
    try {
        const employee = await service.addEmployee(req.body);
        res.status(201).json({ message: "Employee created successfully", data: employee });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.addEmployee = addEmployee;
