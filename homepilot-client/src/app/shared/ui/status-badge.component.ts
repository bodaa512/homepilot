import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/** حالة موحّدة في كل التطبيق. متزوّدش عليها قيم جديدة من غير داعي. */
export type HpStatus = 'ok' | 'due' | 'late' | 'info' | 'neutral';

/**
 * شارة الحالة.
 *
 *   <hp-status-badge status="late" label="متأخرة" />
 *   <hp-status-badge status="ok" />   ← بياخد النص الافتراضي
 */
@Component({
  selector: 'hp-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="'hp-badge hp-badge--' + status">{{ label || fallback[status] }}</span>`,
  styles: [':host { display: inline-flex; }'],
})
export class StatusBadgeComponent {
  @Input() status: HpStatus = 'neutral';
  @Input() label = '';

  readonly fallback: Record<HpStatus, string> = {
    ok: 'تمام',
    due: 'قرّب ميعاده',
    late: 'متأخر',
    info: 'جديد',
    neutral: 'مجدول',
  };
}
