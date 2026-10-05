/** يطابق HomeType في السيرفر (models/Home.ts). */
export type HomeType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'office'
  | 'vacation_property'
  | 'rental_property'
  | 'commercial_property';

export type OwnershipType = 'own' | 'rent';

export interface Home {
  _id: string;
  name: string;
  type: HomeType;
  address?: string;
  city?: string;
  country?: string;
  ownershipType: OwnershipType;
  numberOfRooms?: number;
  numberOfResidents?: number;
  images: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** عنصر واحد من رد GET /homes — كل بيت مع دور المستخدم فيه (services/home.service.ts في السيرفر). */
export interface HomeMembershipEntry {
  home: Home;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface CreateHomePayload {
  name: string;
  type: HomeType;
  address?: string;
  city?: string;
  country?: string;
  ownershipType?: OwnershipType;
  numberOfRooms?: number;
  numberOfResidents?: number;
}

/** PUT /homes/:id — أي حقل مش مبعوت بيفضل زي ما هو؛ نص فاضي ('') بيمسح القيمة. */
export type UpdateHomePayload = Partial<CreateHomePayload>;

export interface HomeSummaryCounts {
  roomCount: number;
  assetCount: number;
}

export type HomeMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const HOME_ROLE_LABELS: Record<HomeMemberRole, string> = {
  OWNER: 'مالك',
  ADMIN: 'مشرف',
  MEMBER: 'عضو',
  VIEWER: 'مشاهد فقط',
};

/** يطابق IHomeMembership بعد الـ populate (services/home.service.ts → listMembers في السيرفر). */
export interface HomeMember {
  _id: string;
  user: { _id: string; fullName: string; email: string; avatarUrl?: string };
  role: HomeMemberRole;
}

export interface InviteMemberPayload {
  email: string;
  role: Exclude<HomeMemberRole, 'OWNER'>;
}

export const HOME_TYPE_LABELS: Record<HomeType, string> = {
  apartment: 'شقة',
  house: 'بيت',
  villa: 'فيلا',
  office: 'مكتب',
  vacation_property: 'شاليه/عزبة',
  rental_property: 'عقار للإيجار',
  commercial_property: 'عقار تجاري',
};
