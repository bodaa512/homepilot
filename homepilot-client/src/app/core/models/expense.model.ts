/** يطابق ExpenseCategory في السيرفر (models/Expense.ts). */
export type ExpenseCategory =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'rent'
  | 'insurance'
  | 'repairs'
  | 'maintenance'
  | 'cleaning'
  | 'furniture'
  | 'renovations'
  | 'subscriptions'
  | 'security'
  | 'miscellaneous';

export interface Expense {
  _id: string;
  home: string;
  asset?: { _id: string; name: string } | null;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
}

export interface CreateExpensePayload {
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod?: string;
  description?: string;
}

/** رد GET /homes/:homeId/expenses/analytics (services/expense.service.ts في السيرفر). */
export interface ExpenseAnalytics {
  totalThisMonth: number;
  totalThisYear: number;
  byCategory: { category: ExpenseCategory; total: number }[];
  monthlyTrend: { year: number; month: number; total: number }[];
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  electricity: 'كهربا',
  water: 'مياه',
  gas: 'غاز',
  internet: 'إنترنت',
  rent: 'إيجار',
  insurance: 'تأمين',
  repairs: 'إصلاحات',
  maintenance: 'صيانة',
  cleaning: 'تنظيف',
  furniture: 'أثاث',
  renovations: 'تجديدات',
  subscriptions: 'اشتراكات',
  security: 'أمان',
  miscellaneous: 'متنوع',
};

/** ألوان دوّارة للفئات في الرسم — نفس أسلوب tokens الحالة الموجود في tokens.css. */
export const EXPENSE_CATEGORY_COLORS: string[] = [
  'var(--hp-info)',
  'var(--hp-due)',
  'var(--hp-ok)',
  'var(--hp-late)',
  'var(--hp-navy-400)',
  'var(--hp-slate-500)',
];
