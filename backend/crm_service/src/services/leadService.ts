import { LeadRepository } from '../repositories/leadRepository';
import { ILead, LeadStatus } from '../models/leadModel';
import { AppError } from '../errors/appError';
import { CustomerService } from './customerService';
import { Customer } from '../entities/customerEntity';
import { logger } from '../config/logger';

export class LeadService {
  private leadRepository: LeadRepository;
  private customerService: CustomerService;

  constructor() {
    this.leadRepository = new LeadRepository();
    this.customerService = new CustomerService();
  }

  /**
   * Creates a new lead.
   */
  async createLead(data: Partial<ILead>, userId: string): Promise<ILead> {
    if (!data.name) {
      throw new AppError('Name is required', 400);
    }
    const leadData = {
      ...data,
      createdBy: userId,
      assignedTo: userId,
      branch_id: data.branch_id,
    };
    return await this.leadRepository.createLead(leadData);
  }

  /**
   * Retrieves all leads based on permissions and filters.
   */
  async getAllLeads(
    userId: string,
    role: string,
    includeDeleted: boolean = false,
    branchId?: string,
  ): Promise<ILead[]> {
    return this.leadRepository.findAllLeads(includeDeleted, branchId);
  }

  /**
   * Retrieves a single lead by ID, checking permissions.
   */
  async getLeadById(leadId: string, userId: string, role: string): Promise<ILead> {
    const lead = await this.leadRepository.findLeadById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
    if (role !== 'ADMIN' && lead.assignedTo !== userId) {
      throw new AppError('Unauthorized access to lead', 403);
    }
    return lead;
  }

  /**
   * Updates an existing lead.
   */
  async updateLead(
    leadId: string,
    data: Partial<ILead>,
    userId: string,
    role: string,
  ): Promise<ILead> {
    const lead = await this.getLeadById(leadId, userId, role);

    const updated = await this.leadRepository.updateLead(String(lead._id), data);
    if (!updated) throw new AppError('Lead not found after update', 404);
    return updated;
  }

  /**
   * Deletes a lead.
   */
  async deleteLead(leadId: string, userId: string, role: string): Promise<void> {
    await this.getLeadById(leadId, userId, role);
    await this.leadRepository.deleteLead(leadId);
  }

  /**
   * Finds the lead that originated a given customer, enforcing branch scope for non-ADMIN.
   */
  async getLeadByCustomerId(
    customerId: string,
    role: string,
    jwtBranchId?: string,
  ): Promise<ILead | null> {
    const lead = await this.leadRepository.findLeadByCustomerId(customerId);
    if (!lead) return null;
    if (role !== 'ADMIN' && lead.branch_id !== jwtBranchId) return null;
    return lead;
  }

  /**
   * Converts a lead into a customer entity.
   */
  async convertLeadToCustomer(
    leadId: string,
    userId: string,
    role: string,
    payload: Partial<Customer> = {},
  ): Promise<string> {
    const lead = await this.leadRepository.findLeadById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    if (lead.isCustomer && lead.customerId) {
      return lead.customerId;
    }

    const name = payload.name || lead.name;
    const email = payload.email || lead.email;
    const phone = payload.phone || lead.phone;
    // For location, we might receive it in the payload during conversion
    const location = (payload as { location?: string }).location || lead.location;
    const address = payload.address;
    const country = payload.country;

    if (!name) throw new AppError('Lead name is required', 400);
    if (!location || location.trim() === '') {
      throw new AppError('Location is required before converting Lead to Customer', 400);
    }

    const customerData: Partial<Customer> = {
      name,
      email,
      phone,
      location,
      address,
      country,
      isActive: true,
      branch_id: lead.branch_id,
    };

    let customer;
    try {
      customer = await this.customerService.createCustomer(customerData);
    } catch (createErr) {
      // If a concurrent request already created a customer with this email,
      // retrieve that record so the lead can still be linked to it.
      if (createErr instanceof AppError && createErr.statusCode === 409 && email) {
        const existing = await this.customerService.findByEmail(email);
        if (existing) {
          customer = existing;
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

    try {
      await this.leadRepository.updateLeadStatus(leadId, LeadStatus.CONVERTED, customer.id);
    } catch (err) {
      // MongoDB update failed after Postgres insert — roll back the customer row
      // so the lead can be re-converted on the next attempt.
      logger.error('Lead status update failed after customer creation — rolling back', {
        customerId: customer.id,
        leadId,
        error: err,
      });
      try {
        await this.customerService.hardDeleteCustomer(customer.id);
      } catch (deleteErr) {
        logger.error('Compensating customer deletion failed — manual cleanup required', {
          customerId: customer.id,
          leadId,
          error: deleteErr,
        });
      }
      throw new AppError('Failed to convert lead. Please try again.', 500);
    }

    return customer.id;
  }
}
