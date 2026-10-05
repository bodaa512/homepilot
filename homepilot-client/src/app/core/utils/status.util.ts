import { HpStatus } from '../../shared/ui/status-badge.component';
import { MaintenanceStatus } from '../models/maintenance.model';
import { arabicMonthCount, formatArabicNumber, relativeDayLabel } from './formatters';

/**
 * الحالة اللي بتتعرض للمستخدم مبنية على status الخام من السيرفر + قرب
 * dueDate. السيرفر بيحوّل PENDING إلى OVERDUE تلقائيًا كل يوم (cron)،
 * فالاعتماد على status نفسه كافي لحالة "متأخرة"، وباقي الحسابات
 * (قرّبت / مجدولة) بتتحدد من عدد الأيام المتبقية.
 */
export function maintenanceStatusView(status: MaintenanceStatus, dueDate: string): { status: HpStatus; label: string } {
  switch (status) {
    case 'COMPLETED':
      return { status: 'ok', label: 'منجزة' };
    case 'OVERDUE':
      return { status: 'late', label: 'متأخرة' };
    case 'IN_PROGRESS':
      return { status: 'info', label: 'جارية' };
    case 'SKIPPED':
      return { status: 'neutral', label: 'متخطاة' };
    case 'CANCELLED':
      return { status: 'neutral', label: 'ملغاة' };
    case 'PENDING':
    default: {
      const { days } = relativeDayLabel(dueDate);
      if (days < 0) return { status: 'late', label: 'متأخرة' };
      if (days <= 7) return { status: 'due', label: 'قرّبت' };
      return { status: 'neutral', label: 'مجدولة' };
    }
  }
}

/** نسبة/لون/نص الضمان لجهاز — محسوبة من warrantyStart/warrantyExpiration الخام. */
export function warrantyView(
  warrantyStart: string | undefined,
  warrantyExpiration: string | undefined,
): { percent: number; label: string; color: string } {
  if (!warrantyExpiration) {
    return { percent: 0, label: '—', color: 'var(--hp-border)' };
  }

  const end = new Date(warrantyExpiration).getTime();
  const now = Date.now();

  if (end <= now) {
    return { percent: 0, label: 'منتهي', color: 'var(--hp-late)' };
  }

  const start = warrantyStart ? new Date(warrantyStart).getTime() : now;
  const total = Math.max(end - start, 1);
  const remaining = end - now;
  const percent = Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
  const monthsLeft = Math.max(1, Math.round(remaining / (30 * 86_400_000)));
  const color = percent <= 15 ? 'var(--hp-late)' : percent <= 40 ? 'var(--hp-due)' : 'var(--hp-ok)';

  return { percent, label: arabicMonthCount(monthsLeft), color };
}

/** حالة مستند بناءً على قرب تاريخ انتهائه (لو موجود) — نفس ألوان الحالة العامة. */
export function documentStatusView(expirationDate: string | undefined): { status: HpStatus; label: string } {
  if (!expirationDate) return { status: 'ok', label: 'مقروءة' };
  const { days } = relativeDayLabel(expirationDate);
  if (days < 0) return { status: 'late', label: 'منتهي' };
  if (days <= 30) return { status: 'due', label: 'قرّب ينتهي' };
  return { status: 'ok', label: 'ساري' };
}

/** حالة الجهاز (condition) معروضة كشارة حالة موحّدة مع باقي التطبيق. */
export function assetConditionView(condition: string): { status: HpStatus; label: string } {
  switch (condition) {
    case 'NEW':
    case 'GOOD':
      return { status: 'ok', label: 'تمام' };
    case 'FAIR':
      return { status: 'due', label: 'محتاج متابعة' };
    case 'NEEDS_ATTENTION':
      return { status: 'due', label: 'محتاج صيانة' };
    case 'CRITICAL':
      return { status: 'late', label: 'حالة حرجة' };
    case 'RETIRED':
      return { status: 'neutral', label: 'متقاعد' };
    default:
      return { status: 'neutral', label: condition };
  }
}

/** حجم ملف مقروء: "٢٫٤ م.ب" أو "٣٨٠ ك.ب". */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${formatArabicNumber(bytes / (1024 * 1024), 1)} م.ب`;
  if (bytes >= 1024) return `${formatArabicNumber(Math.round(bytes / 1024))} ك.ب`;
  return `${formatArabicNumber(bytes)} بايت`;
}
