/** يطابق IUser في السيرفر (models/User.ts) — بس الحقول العامة اللي الـ API بيرجّعها. */
export type GlobalRole = 'owner' | 'renter' | 'provider' | 'property_manager' | 'platform_admin';

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: GlobalRole;
  avatarUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
  locale: string;
  planCode: 'free' | 'premium' | 'property_pro';
  /** تاريخ تجديد الباقة المدفوعة (ISO) — مفيش للباقة المجانية. */
  planRenewsAt?: string;
  createdAt?: string;
}

/** الرد من /auth/login و/auth/register و/auth/refresh (AuthController في السيرفر). */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role?: Exclude<GlobalRole, 'platform_admin'>;
}

/** PATCH /auth/me — تليفون فاضي ('') بيمسح الرقم المحفوظ. */
export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
