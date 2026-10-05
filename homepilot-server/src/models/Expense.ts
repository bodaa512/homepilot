import { Schema, model, Document, Types } from 'mongoose';

export enum ExpenseCategory {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  GAS = 'gas',
  INTERNET = 'internet',
  RENT = 'rent',
  INSURANCE = 'insurance',
  REPAIRS = 'repairs',
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  FURNITURE = 'furniture',
  RENOVATIONS = 'renovations',
  SUBSCRIPTIONS = 'subscriptions',
  SECURITY = 'security',
  MISCELLANEOUS = 'miscellaneous',
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  asset?: Types.ObjectId;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: Date;
  paymentMethod?: string;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP' },
    category: { type: String, enum: Object.values(ExpenseCategory), required: true },
    date: { type: Date, required: true },
    paymentMethod: { type: String, trim: true },
    description: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Powers every analytics/chart query, which always aggregates by home + a date range.
expenseSchema.index({ home: 1, date: -1 });
// Powers "spending by category" breakdowns.
expenseSchema.index({ home: 1, category: 1 });

export const Expense = model<IExpense>('Expense', expenseSchema);
