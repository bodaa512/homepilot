/** يطابق AssetCategory في السيرفر (models/Asset.ts). */
export type AssetCategory =
  | 'refrigerator'
  | 'washing_machine'
  | 'dishwasher'
  | 'oven'
  | 'microwave'
  | 'air_conditioner'
  | 'television'
  | 'water_heater'
  | 'water_pump'
  | 'router'
  | 'security_camera'
  | 'solar_panel'
  | 'furniture'
  | 'smart_device'
  | 'other';

export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'RETIRED';

export interface Asset {
  _id: string;
  home: string;
  room?: { _id: string; name: string } | null;
  category: AssetCategory;
  name: string;
  brand?: string;
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency: string;
  warrantyStart?: string;
  warrantyExpiration?: string;
  expectedLifespanMonths?: number;
  condition: AssetCondition;
  imageUrl?: string;
  notes?: string;
  totalRepairCost: number;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPayload {
  room?: string;
  category: AssetCategory;
  name: string;
  brand?: string;
  modelName?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyStart?: string;
  warrantyExpiration?: string;
  notes?: string;
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  refrigerator: 'ثلاجة',
  washing_machine: 'غسّالة',
  dishwasher: 'غسّالة أطباق',
  oven: 'فرن',
  microwave: 'ميكروويف',
  air_conditioner: 'تكييف',
  television: 'تليفزيون',
  water_heater: 'سخّان',
  water_pump: 'طلمبة مياه',
  router: 'راوتر',
  security_camera: 'كاميرا مراقبة',
  solar_panel: 'لوح شمسي',
  furniture: 'أثاث',
  smart_device: 'جهاز ذكي',
  other: 'أخرى',
};
