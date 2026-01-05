import { BranchRepository } from '../repositories/branchRepository';
import { AppError } from '../errors/appError';
import { publishBranchCreated, publishBranchUpdated } from '../events/publishers/branchPublisher';
import { BranchStatus } from '../entities/branchEntity';
import { Source } from '../config/db';
import { EmployeeManager } from '../entities/employeeManagerEntity';

export class BranchService {
  constructor(private readonly repo: BranchRepository) {}

  async createBranch(payload: {
    name: string;
    address: string;
    location: string;
    manager_id: string;
    started_date: Date;
  }) {
    const managerRepo = Source.getRepository(EmployeeManager);

    const manager = await managerRepo.findOne({
      where: {
        employee_id: payload.manager_id,
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new AppError('Manager does not exist or inactive', 400);
    }

    const branch = await this.repo.create(payload);

    if (!branch) {
      throw new AppError('Failed to create branch', 500);
    }

    await publishBranchCreated({
      branchId: branch.id,
      name: branch.name,
      managerId: branch.manager_id,
      location: branch.location,
      createdAt: new Date().toISOString(),
    });

    return branch;
  }

  getBranches() {
    return this.repo.findAll();
  }

  async deleteBranch(id: string) {
    const branch = await this.repo.findById(id);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    await this.repo.softDelete(id);
    return true;
  }

  async updateBranch(
    id: string,
    payload: {
      name?: string;
      address?: string;
      location?: string;
      manager_id?: string;
      started_date?: Date;
      status?: BranchStatus;
    },
  ) {
    if (payload.manager_id) {
      const managerRepo = Source.getRepository(EmployeeManager);

      const manager = await managerRepo.findOne({
        where: {
          employee_id: payload.manager_id,
          status: 'ACTIVE',
        },
      });

      if (!manager) {
        throw new AppError('Manager does not exist or inactive', 400);
      }
    }

    const branch = await this.repo.findById(id);

    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    if (branch.status === BranchStatus.DELETED) {
      throw new AppError('Cannot update deleted branch', 400);
    }

    const updatePayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(updatePayload).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    await this.repo.update(id, updatePayload);

    await publishBranchUpdated({
      branchId: id,
      updatedFields: Object.keys(updatePayload),
      updatedAt: new Date().toISOString(),
    });

    return true;
  }
}
