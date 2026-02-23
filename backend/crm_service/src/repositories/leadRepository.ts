import { LeadModel, ILead, LeadStatus } from '../models/leadModel';

export class LeadRepository {
  /**
   * Creates a new lead in the database.
   */
  async createLead(data: Partial<ILead>): Promise<ILead> {
    return await LeadModel.create(data);
  }

  /**
   * Retrieves all leads, optionally including deleted ones.
   */
  async findAllLeads(includeDeleted = false): Promise<ILead[]> {
    const filter = includeDeleted ? {} : { isDeleted: false };
    return await LeadModel.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Finds a lead by ID.
   */
  async findLeadById(id: string): Promise<ILead | null> {
    return await LeadModel.findById(id);
  }

  /**
   * Updates a lead.
   */
  async updateLead(id: string, data: Partial<ILead>): Promise<ILead | null> {
    return await LeadModel.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Soft deletes a lead.
   */
  async deleteLead(id: string): Promise<ILead | null> {
    return await this.updateLead(id, { isDeleted: true });
  }

  /**
   * Updates a lead's status and optionally links a customer ID.
   */
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
