/** يطابق DocumentType في السيرفر (models/Document.ts). */
export type HpDocumentType =
  | 'invoice'
  | 'receipt'
  | 'warranty'
  | 'contract'
  | 'insurance'
  | 'manual'
  | 'maintenance_report'
  | 'other';

export interface HpDocument {
  _id: string;
  home: string;
  asset?: { _id: string; name: string } | null;
  type: HpDocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageType: 'local' | 'cloudinary';
  expirationDate?: string;
  extractedAmount?: number;
  extractedDate?: string;
  ocrStatus: 'skipped' | 'processing' | 'done' | 'failed';
  createdAt: string;
}

export const DOCUMENT_TYPE_LABELS: Record<HpDocumentType, string> = {
  invoice: 'فاتورة',
  receipt: 'إيصال',
  warranty: 'ضمان',
  contract: 'عقد',
  insurance: 'تأمين',
  manual: 'دليل استخدام',
  maintenance_report: 'تقرير صيانة',
  other: 'أخرى',
};
