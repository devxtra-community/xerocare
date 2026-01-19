import { LeadModel, ILead } from '../models/leadModel';

export class LeadRepository {
  async createLead(data: Partial<ILead>): Promise<ILead> {
    const lead = new LeadModel(data);
    return await lead.save();
  }

  async findLeadById(leadId: string): Promise<ILead | null> {
    return await LeadModel.findOne({ _id: leadId });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findAllLeads(filter: any = {}): Promise<ILead[]> {
    return await LeadModel.find(filter).sort({ createdAt: -1 });
  }

  async updateLead(leadId: string, data: Partial<ILead>): Promise<ILead | null> {
    return await LeadModel.findByIdAndUpdate(leadId, data, { new: true });
  }

  async deleteLead(leadId: string): Promise<ILead | null> {
    return await LeadModel.findByIdAndUpdate(leadId, { isDeleted: true }, { new: true });
  }

  async updateLeadStatus(
    leadId: string,
    status: ILead['status'],
    customerId?: string,
  ): Promise<ILead | null> {
    const updateData: Partial<ILead> = { status };
    if (customerId) {
      updateData.customerId = customerId;
    }
    return await LeadModel.findByIdAndUpdate(leadId, updateData, { new: true });
  }
}
