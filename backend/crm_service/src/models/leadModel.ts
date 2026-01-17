import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  metadata: Record<string, unknown>;
  customerId?: string;
  isCustomer: boolean; // Track if lead is converted to customer
  assignedTo?: string; // userId of the assignee
  createdBy: string; // userId of the creator
  convertedBy?: string; // userId of the converter
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    source: { type: String },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      default: 'new',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    customerId: { type: String },
    isCustomer: { type: Boolean, default: false }, // Default false
    assignedTo: { type: String },
    createdBy: { type: String, required: true },
    convertedBy: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const LeadModel = mongoose.model<ILead>('Lead', LeadSchema, 'leads');
