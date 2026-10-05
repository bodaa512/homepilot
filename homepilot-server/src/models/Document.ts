import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export enum DocumentType {
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  WARRANTY = 'warranty',
  CONTRACT = 'contract',
  INSURANCE = 'insurance',
  MANUAL = 'manual',
  MAINTENANCE_REPORT = 'maintenance_report',
  OTHER = 'other',
}

export interface IDocument extends MongooseDocument {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  asset?: Types.ObjectId;
  type: DocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  storageType: 'local' | 'cloudinary';
  expirationDate?: Date;
  uploadedBy: Types.ObjectId;
  extractedText?: string;
  extractedAmount?: number;
  extractedDate?: Date;
  ocrStatus: 'skipped' | 'processing' | 'done' | 'failed';
  createdAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    type: { type: String, enum: Object.values(DocumentType), default: DocumentType.OTHER },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    // Path on local disk relative to the server's uploads root, OR a full
    // Cloudinary URL when CLOUDINARY_* env vars are configured — see
    // services/storage.service.ts, the only place that branches on this.
    storagePath: { type: String, required: true },
    storageType: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
    expirationDate: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    extractedText: { type: String, maxlength: 5000 },
    extractedAmount: { type: Number },
    extractedDate: { type: Date },
    ocrStatus: { type: String, enum: ['skipped', 'processing', 'done', 'failed'], default: 'skipped' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentSchema.index({ home: 1, createdAt: -1 });
// Powers the warranty/contract expiration reminder scan.
documentSchema.index({ expirationDate: 1 });

export const Document = model<IDocument>('Document', documentSchema);
