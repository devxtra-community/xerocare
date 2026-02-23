import { Request, Response } from 'express';
import { Source } from '../config/dataSource';
import { Employee, EmployeeStatus } from '../entities/employeeEntities';
import { Payroll } from '../entities/payrollEntity';
import { PayrollStatus } from '../constants/payrollStatus';
import { Notification } from '../entities/notificationEntity';
import { logger } from '../config/logger';
import { AccessTokenPayload } from '../types/jwt';

export class PayrollController {
  static async getPayrollSummary(req: Request, res: Response) {
    try {
      const user = req.user as AccessTokenPayload;
      const branchId = user.branchId;
      const isAdmin = user.role === 'ADMIN';
      const effectiveBranchId = isAdmin ? undefined : branchId;

      if (!effectiveBranchId && !isAdmin) {
        return res.status(400).json({ message: 'Branch ID not found in user session' });
      }

      const employeeRepo = Source.getRepository(Employee);

      const employees = await employeeRepo.find({
        where: {
          status: EmployeeStatus.ACTIVE,
          ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
        },
        relations: ['branch'],
      });

      const payrollRepo = Source.getRepository(Payroll);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const payrollData = await Promise.all(
        employees.map(async (emp) => {
          const record = await payrollRepo.findOne({
            where: {
              employee_id: emp.id,
              month: currentMonth,
              year: currentYear,
            },
          });

          return {
            id: emp.id,
            name:
              `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email.split('@')[0],
            email: emp.email,
            role: emp.role,
            branch_name: emp.branch?.name || 'N/A',
            department: (() => {
              if (emp.role === 'HR') return 'HR';
              if (emp.role === 'MANAGER') return 'Management';
              if (emp.role === 'ADMIN') return 'Administration';

              const jobLabels: Record<string, string> = {
                SALES: 'Sales',
                RENT: 'Rent',
                LEASE: 'Lease',
                RENT_LEASE: 'Rent & Lease',
                CRM: 'CRM',
                TECHNICIAN: 'Technician / Service',
                DELIVERY: 'Delivery & Installation',
                READING_AGENT: 'Meter Reading Agent',
                EMPLOYEE_MANAGER: 'Employee Manager',
                FINANCE_SALES: 'Finance - Sales',
                FINANCE_RENT_LEASE: 'Finance - Rent & Lease',
                FINANCE_MANAGER: 'Finance Manager',
              };

              const job = emp.employee_job || emp.finance_job;
              return job ? jobLabels[job] || job : emp.role;
            })(),
            salary: record ? record.salary_amount : emp.salary || 0,
            leave_days: record ? record.leave_days : 2,
            status: record ? record.status : PayrollStatus.PENDING,
            paid_date: record ? record.paid_date : null,
            payroll_id: record ? record.id : null,
          };
        }),
      );

      return res.status(200).json(payrollData);
    } catch (error) {
      logger.error('Error fetching payroll summary:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createPayroll(req: Request, res: Response) {
    try {
      const { employee_id, salary_amount, status, paid_date, month, year } = req.body;

      if (!employee_id || !salary_amount) {
        return res.status(400).json({ message: 'Employee ID and salary amount are required' });
      }

      const employeeRepo = Source.getRepository(Employee);
      const employee = await employeeRepo.findOne({
        where: { id: employee_id },
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const employeeBranchId = employee.branch_id;
      if (!employeeBranchId) {
        return res.status(400).json({ message: 'Employee is not assigned to any branch' });
      }

      const payrollRepo = Source.getRepository(Payroll);

      const now = new Date();
      const payrollMonth = month || now.getMonth() + 1;
      const payrollYear = year || now.getFullYear();

      const existingPayroll = await payrollRepo.findOne({
        where: { employee_id, month: payrollMonth, year: payrollYear },
      });

      if (existingPayroll) {
        return res
          .status(400)
          .json({ message: 'Payroll record already exists for this month and year' });
      }

      const newPayroll = payrollRepo.create({
        employee_id,
        branch_id: employeeBranchId,
        month: payrollMonth,
        year: payrollYear,
        salary_amount: parseFloat(salary_amount),
        status: status || PayrollStatus.PENDING,
        paid_date: paid_date ? new Date(paid_date) : null,
        work_days: 25,
        leave_days: 0,
      });

      await payrollRepo.save(newPayroll);

      if (status === PayrollStatus.PAID) {
        const notificationRepo = Source.getRepository(Notification);
        const notification = notificationRepo.create({
          employee_id,
          title: 'Salary Paid',
          message: `Your salary for ${payrollMonth}/${payrollYear} has been paid.`,
          type: 'SALARY_PAID',
          data: {
            payroll_id: newPayroll.id,
            amount: salary_amount,
            month: payrollMonth,
            year: payrollYear,
            paid_date: newPayroll.paid_date,
            leave_days: newPayroll.leave_days,
          },
        });
        await notificationRepo.save(notification);
      }

      return res
        .status(201)
        .json({ message: 'Payroll record created successfully', payroll: newPayroll });
    } catch (error) {
      logger.error('Error creating payroll record:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updatePayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { salary_amount, status, paid_date, leave_days } = req.body;

      const payrollRepo = Source.getRepository(Payroll);
      const payroll = await payrollRepo.findOne({
        where: { id: id as string },
        relations: ['employee'],
      });

      if (!payroll) {
        return res.status(404).json({ message: 'Payroll record not found' });
      }

      const oldStatus = payroll.status;

      if (salary_amount !== undefined) payroll.salary_amount = parseFloat(salary_amount);
      if (status !== undefined) payroll.status = status;
      if (paid_date !== undefined) payroll.paid_date = paid_date ? new Date(paid_date) : null;
      if (leave_days !== undefined) payroll.leave_days = parseInt(leave_days);

      await payrollRepo.save(payroll);

      if (status === PayrollStatus.PAID && oldStatus !== PayrollStatus.PAID) {
        const notificationRepo = Source.getRepository(Notification);
        const notification = notificationRepo.create({
          employee_id: payroll.employee_id,
          title: 'Salary Paid',
          message: `Your salary for ${payroll.month}/${payroll.year} has been paid.`,
          type: 'SALARY_PAID',
          data: {
            payroll_id: payroll.id,
            amount: payroll.salary_amount,
            month: payroll.month,
            year: payroll.year,
            paid_date: payroll.paid_date,
            leave_days: payroll.leave_days,
          },
        });
        await notificationRepo.save(notification);
      }

      return res.status(200).json({ message: 'Payroll record updated successfully', payroll });
    } catch (error) {
      logger.error('Error updating payroll record:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getPayrollStats(req: Request, res: Response) {
    try {
      const user = req.user as AccessTokenPayload;
      const branchId = user.branchId;
      const isAdmin = user.role === 'ADMIN';

      if (!branchId && !isAdmin) {
        return res.status(400).json({ message: 'Branch ID not found in user session' });
      }

      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const payrollRepo = Source.getRepository(Payroll);
      const qb = payrollRepo
        .createQueryBuilder('payroll')
        .innerJoin('payroll.employee', 'employee')
        .where('payroll.status = :status', { status: PayrollStatus.PAID });

      if (branchId && branchId !== 'All') {
        qb.andWhere('employee.branch_id = :branchId', { branchId });
      }

      if (year) {
        qb.andWhere('payroll.year = :year', { year });
      }

      const totalRes = await qb.select('SUM(payroll.salary_amount)', 'total').getRawOne();

      const monthlyRes = await qb
        .select("TO_CHAR(MAKE_DATE(payroll.year, payroll.month, 1), 'YYYY-MM')", 'month')
        .addSelect('SUM(payroll.salary_amount)', 'total')
        .groupBy("TO_CHAR(MAKE_DATE(payroll.year, payroll.month, 1), 'YYYY-MM')")
        .orderBy('month', 'ASC')
        .getRawMany();

      return res.status(200).json({
        totalSalaries: parseFloat(totalRes?.total) || 0,
        monthlySalaries: monthlyRes.map((r) => ({
          month: r.month,
          total: parseFloat(r.total) || 0,
        })),
      });
    } catch (error) {
      logger.error('Error fetching payroll stats:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getEmployeePayrollHistory(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      if (!employeeId) {
        return res.status(400).json({ message: 'Employee ID is required' });
      }

      const payrollRepo = Source.getRepository(Payroll);
      const history = await payrollRepo.find({
        where: { employee_id: employeeId as string },
        order: { year: 'DESC', month: 'DESC' },
      });

      return res.status(200).json(history);
    } catch (error) {
      logger.error('Error fetching employee payroll history:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
