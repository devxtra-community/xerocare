import { LeadModel, ILead, LeadStatus } from '../models/leadModel';

export class LeadRepository {
  async createLead(data: Partial<ILead>): Promise<ILead> {
    return await LeadModel.create(data);
  }

  async findAllLeads(includeDeleted = false): Promise<ILead[]> {
    const filter = includeDeleted ? {} : { isDeleted: false };
    return await LeadModel.find(filter).sort({ createdAt: -1 });
  }

  async findLeadById(id: string): Promise<ILead | null> {
    return await LeadModel.findById(id);
  }

  async updateLead(id: string, data: Partial<ILead>): Promise<ILead | null> {
    return await LeadModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteLead(id: string): Promise<ILead | null> {
    // Soft delete
    return await this.updateLead(id, { isDeleted: true });
  }

  async updateLeadStatus(
    id: string,
    status: LeadStatus,
    customerId?: string,
  ): Promise<ILead | null> {
    const updateData: Partial<ILead> = { status };
    if (customerId) {
      updateData.customerId = customerId;
      updateData.isCustomer = true;
    }
    return await this.updateLead(id, updateData);
  }
}
