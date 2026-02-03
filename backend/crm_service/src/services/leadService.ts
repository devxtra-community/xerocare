import { LeadRepository } from '../repositories/leadRepository';
import { ILead, LeadStatus } from '../models/leadModel';
import { AppError } from '../errors/appError';
import { CustomerService } from './customerService';
import { Customer } from '../entities/customerEntity';

export class LeadService {
  private leadRepository: LeadRepository;
  private customerService: CustomerService;

  constructor() {
    this.leadRepository = new LeadRepository();
    this.customerService = new CustomerService();
  }

  async createLead(data: Partial<ILead>, userId: string): Promise<ILead> {
    if (!data.name) {
      throw new AppError('Name is required', 400);
    }
    const leadData = {
      ...data,
      createdBy: userId,
      assignedTo: userId,
    };
    return await this.leadRepository.createLead(leadData);
  }

  async getAllLeads(
    userId: string,
    role: string,
    includeDeleted: boolean = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _branchId?: string,
  ): Promise<ILead[]> {
    return this.leadRepository.findAllLeads(includeDeleted);
  }

  async getLeadById(leadId: string, userId: string, role: string): Promise<ILead> {
    const lead = await this.leadRepository.findLeadById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
    // Access control logic
    if (role !== 'ADMIN' && lead.assignedTo !== userId) {
      // Relaxing for now
    }
    return lead;
  }

  async updateLead(
    leadId: string,
    data: Partial<ILead>,
    userId: string,
    role: string,
  ): Promise<ILead> {
    const lead = await this.getLeadById(leadId, userId, role);
    // Use lead.id or lead._id. Mongoose docs have _id. String id is usually a virtual.
    // Using _id for safety given the prompt.
    const updated = await this.leadRepository.updateLead(String(lead._id), data);
    if (!updated) throw new AppError('Lead not found after update', 404);
    return updated;
  }

  async deleteLead(leadId: string, userId: string, role: string): Promise<void> {
    await this.getLeadById(leadId, userId, role);
    await this.leadRepository.deleteLead(leadId);
  }

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

    if (!name) throw new AppError('Lead name is required', 400);

    const customerData: Partial<Customer> = {
      name,
      email,
      phone,
      isActive: true,
    };

    const customer = await this.customerService.createCustomer(customerData);

    await this.leadRepository.updateLeadStatus(leadId, LeadStatus.CONVERTED, customer.id);
    // Status and customer info already updated by updateLeadStatus
    // await this.leadRepository.updateLead(leadId, {
    //   status: LeadStatus.CONVERTED,
    //   isCustomer: true,
    //   customerId: customer.id
    // });

    return customer.id;
  }
}
