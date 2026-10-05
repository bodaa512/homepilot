/** يطابق ServiceCategory في السيرفر (models/Provider.ts). */
export type ServiceCategory =
  | 'plumbing'
  | 'electricity'
  | 'ac'
  | 'appliance_repair'
  | 'cleaning'
  | 'painting'
  | 'carpentry'
  | 'locksmith'
  | 'internet'
  | 'home_inspection';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  plumbing: 'سباكة',
  electricity: 'كهرباء',
  ac: 'تكييف',
  appliance_repair: 'صيانة أجهزة',
  cleaning: 'تنظيف',
  painting: 'دهانات',
  carpentry: 'نجارة',
  locksmith: 'أقفال',
  internet: 'إنترنت',
  home_inspection: 'فحص البيت',
};

/** يطابق ServiceRequestUrgency في السيرفر. */
export type ServiceRequestUrgency = 'low' | 'medium' | 'high' | 'emergency';

export const URGENCY_LABELS: Record<ServiceRequestUrgency, string> = {
  low: 'عادي',
  medium: 'متوسط',
  high: 'مستعجل',
  emergency: 'طوارئ',
};

/** يطابق ServiceRequestStatus في السيرفر (models/ServiceRequest.ts). */
export type ServiceRequestStatus =
  | 'REQUESTED'
  | 'REVIEWING'
  | 'OFFERS_RECEIVED'
  | 'PROVIDER_SELECTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REVIEWED'
  | 'CANCELLED';

export const REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  REQUESTED: 'طلب جديد',
  REVIEWING: 'بتتراجع',
  OFFERS_RECEIVED: 'فيه عروض',
  PROVIDER_SELECTED: 'اتحدد مزوّد',
  SCHEDULED: 'اتحدد ميعاد',
  IN_PROGRESS: 'جاري التنفيذ',
  COMPLETED: 'خلصت',
  REVIEWED: 'اتقيّمت',
  CANCELLED: 'ملغاة',
};

export interface ServiceRequest {
  _id: string;
  home: string;
  category: ServiceCategory;
  title: string;
  description?: string;
  urgency: ServiceRequestUrgency;
  preferredDate?: string;
  estimatedBudget?: number;
  status: ServiceRequestStatus;
  createdAt: string;
}

export interface CreateServiceRequestPayload {
  category: ServiceCategory;
  title: string;
  description?: string;
  urgency?: ServiceRequestUrgency;
  preferredDate?: string;
  estimatedBudget?: number;
}

export interface OfferProvider {
  _id: string;
  businessName: string;
  ratingAverage: number;
  ratingCount: number;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
}

/** يطابق IServiceOffer بعد الـ populate (services/offer.service.ts في السيرفر). */
export interface ServiceOffer {
  _id: string;
  provider: OfferProvider;
  price: number;
  currency: string;
  estimatedDurationHours?: number;
  proposedDate?: string;
  message?: string;
  warrantyPeriodDays?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export interface ChatMessage {
  _id: string;
  sender: string;
  text: string;
  createdAt: string;
}

export interface CreateReviewPayload {
  ratingOverall: number;
  comment?: string;
}
