import { LeadRepository } from '../repositories/leadRepository';
import { ILead } from '../models/leadModel';

import { CustomerService } from './customerService';
import { AppError } from '../errors/appError';
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
      assignedTo: userId, // Auto-assign to creator
    };
    return await this.leadRepository.createLead(leadData);
  }

  async getAllLeads(
    userId: string,
    role: string,
    includeDeleted: boolean = false,
  ): Promise<ILead[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (role !== 'ADMIN') {
      filter.assignedTo = userId;
    }

    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    // If includeDeleted is true, we simply don't filter by isDeleted, getting both.
    // Or should we filter ONLY deleted? The requirement "show leads with is deleted true" implies viewing them.
    // A toggle usually means "Show specific list" or "Include them".
    // I'll opt for "Include them" behavior via `isDeleted` key absence, or explicit query if needed.
    // Actually, if I want ONLY deleted, I'd pass `isDeleted: true`.
    // Let's support flexible filter.
    // But for now, safe default is exclude.

    // Also we were filtering `isCustomer = false` before.
    // "Filter out converted leads by default" was on line 34.
    // If we want to see ALL leads, we might want to see converted too?
    // User request: "also view lead and customer".
    // If I am looking at Leads table, maybe I want to see Active Leads.
    // Let's keep `isCustomer = false` default?
    // Wait, line 34: `filter.isCustomer = false`.
    // If I convert a lead, it becomes `isCustomer=true`. It disappears from Leads list?
    // User said "also view lead and customer".
    // Maybe Leads table should show converted ones too with a status "Converted"?
    // I will remove the `isCustomer = false` strict filter or make it optional?
    // Line 34 was: `filter.isCustomer = false;`
    // I will commented it out OR allow overriding.
    // Let's remove it to allow "Converted" leads to show up in the table (with status Converted).
    // filter.isCustomer = false; // logic removed to allow converted leads visibility

    return await this.leadRepository.findAllLeads(filter);
  }

  async getLeadById(leadId: string, userId: string, role: string): Promise<ILead> {
    const lead = await this.leadRepository.findLeadById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
    if (role !== 'ADMIN' && lead.assignedTo !== userId) {
      throw new AppError('Access denied', 403);
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
    return (await this.leadRepository.updateLead(lead._id as unknown as string, data))!;
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

    if (role !== 'ADMIN' && lead.assignedTo !== userId) {
      // NOTE: Relaxing this check if we want any employee to convert a lead during a sale?
      // The requirement says "frontend sales flow ... select lead ... convertLead".
      // Usually sales might pick up any lead?
      // For now, I'll keep it strict but maybe allow if it's open?
      // Re-reading user request: "frontend controls when conversion happens ... select lead -> check isCustomer".
      // If I am a salesperson but not the lead owner, can I convert?
      // Let's assume ownership is stricter for managing, but maybe conversion allows transfer?
      // I will stick to ownership check for now to be safe, unless user complains.
      throw new AppError('Access denied: You can only convert your own leads', 403);
    }

    // Idempotency check
    if (lead.isCustomer && lead.customerId) {
      return lead.customerId;
    }

    // Merge lead data with payload
    // Merge lead data with payload
    const name = payload.name || lead.name;
    const email = payload.email || lead.email;
    const phone = payload.phone || lead.phone;

    if (!name) {
      throw new AppError('Lead name is required for conversion', 400);
    }

    if (!email && !phone) {
      throw new AppError('Either email or phone is required for conversion', 400);
    }

    const customerData: Partial<Customer> = {
      name,
      email,
      phone,
      isActive: true,
    };

    const customer = await this.customerService.createCustomer(customerData);

    // Update lead with new customer info
    await this.leadRepository.updateLeadStatus(leadId, 'converted', customer.id);

    // Also set isCustomer = true explicitly in DB update if updateLeadStatus doesn't
    // Wait, updateLeadStatus implementation in repo likely just sets status and customerId.
    // I need to make sure `isCustomer` is also set. I should probably use `updateLead` or update the repo method.
    // Let's check repo method via viewing it or just use updateLead here for safety.
    await this.leadRepository.updateLead(leadId, {
      isCustomer: true,
      customerId: customer.id,
      status: 'converted',
    });

    return customer.id;
  }
}
