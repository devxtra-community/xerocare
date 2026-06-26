import { BranchRepository } from '../repositories/branchRepository';
import { AppError } from '../errors/appError';
import { publishBranchCreated, publishBranchUpdated } from '../events/publishers/branchPublisher';
import { BranchStatus } from '../entities/branchEntity';
import { EmployeeManagerRepository } from '../repositories/employeeManagerRepository';

export class BranchService {
  private managerRepo = new EmployeeManagerRepository();

  constructor(private readonly repo: BranchRepository) {}

  /**
   * Creates a new branch and publishes an event.
   */
  async createBranch(payload: {
    name: string;
    address: string;
    location: string;
    manager_id?: string | null;
    started_date: Date;
    // Currency & Country
    country_code?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_name?: string;
    // Tax
    has_tax?: boolean;
    tax_name?: string | null;
    tax_percent?: number | null;
    tax_registration_number?: string | null;
    // Address details
    city?: string;
    state?: string;
    postal_code?: string;
  }) {
    const managerId =
      payload.manager_id && payload.manager_id.trim() !== '' ? payload.manager_id : null;

    if (managerId) {
      const manager = await this.managerRepo.findActiveManager(managerId);
      if (!manager) {
        throw new AppError('Manager does not exist or inactive', 400);
      }

      const existingBranch = await this.repo.findByManagerId(managerId);
      if (existingBranch) {
        throw new AppError(`Manager is already assigned to branch: ${existingBranch.name}`, 400);
      }
    }

    const branch = await this.repo.create({
      ...payload,
      manager_id: managerId || undefined,
    });

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

  /**
   * Retrieves all branches.
   */
  getBranches() {
    return this.repo.findAll();
  }

  /**
   * Retrieves a branch by ID.
   */
  async getBranchById(id: string) {
    const branch = await this.repo.findById(id);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }
    return branch;
  }

  /**
   * Soft deletes a branch.
   */
  async deleteBranch(id: string) {
    const branch = await this.repo.findById(id);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    await this.repo.softDelete(id);
    return true;
  }

  /**
   * Updates a branch and publishes an update event.
   */
  async updateBranch(
    id: string,
    payload: {
      name?: string;
      address?: string;
      location?: string;
      manager_id?: string | null;
      started_date?: Date;
      status?: BranchStatus;
      // Currency & Country
      country_code?: string;
      currency_code?: string;
      currency_symbol?: string;
      currency_name?: string;
      // Tax
      has_tax?: boolean;
      tax_name?: string | null;
      tax_percent?: number | null;
      tax_registration_number?: string | null;
      // Address details
      city?: string;
      state?: string;
      postal_code?: string;
    },
  ) {
    let managerId: string | null | undefined = payload.manager_id;
    if (managerId !== undefined) {
      if (managerId === '' || managerId === null) {
        managerId = null;
      } else {
        const manager = await this.managerRepo.findActiveManager(managerId);

        if (!manager) {
          throw new AppError('Manager does not exist or inactive', 400);
        }

        const existingBranch = await this.repo.findByManagerId(managerId);
        if (existingBranch && existingBranch.id !== id) {
          throw new AppError(`Manager is already assigned to branch: ${existingBranch.name}`, 400);
        }
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
      Object.entries({
        ...payload,
        manager_id: managerId,
      }).filter(([, v]) => v !== undefined),
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
