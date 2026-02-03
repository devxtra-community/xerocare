import mongoose, { Schema, Document } from 'mongoose';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export interface ILead extends Document {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: LeadStatus;
  metadata?: Record<string, unknown>;
  customerId?: string;
  isCustomer: boolean; // default false
  assignedTo?: string; // userId
  createdBy?: string;
  convertedBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    source: { type: String, default: 'Website' },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
    },
    metadata: { type: Schema.Types.Mixed },
    customerId: { type: String },
    isCustomer: { type: Boolean, default: false },
    assignedTo: { type: String },
    createdBy: { type: String },
    convertedBy: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes
LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ isDeleted: 1 });
LeadSchema.index({ assignedTo: 1 });

export const LeadModel = mongoose.model<ILead>('Lead', LeadSchema);
