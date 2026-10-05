import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

/** شهر واحد على شريط السنة، ومعاه حالات المهام اللي فيه. */
export interface MaintenanceMonth {
  label: string;
  /** كل مهمة في الشهر ده بحالتها — بتترسم كشرطة صغيرة. */
  marks: ('ok' | 'due' | 'late' | 'planned')[];
  current?: boolean;
}

/**
 * لوحة حالة البيت — العنصر البطل في لوحة القيادة.
 *
 * الفكرة: بدل ما المستخدم يقرا ٦ كروت أرقام، يبص بصة واحدة ويعرف
 * هل في حاجة عايزاه دلوقتي ولا لأ. اللمبات التلاتة بتستخدم نفس
 * ألوان الحالة الموجودة في كل التطبيق.
 *
 *   <hp-status-panel [late]="1" [due]="2" [ok]="21" [months]="months" updatedAt="من ساعتين" />
 */
@Component({
  selector: 'hp-status-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <div class="panel__top">
        <div class="readout">
          <strong>{{ headline() }}</strong>
          <small>{{ subline() }}</small>
        </div>

        <div class="lamps" role="group" aria-label="ملخّص حالة الأجهزة">
          <span class="lamp lamp--late" *ngIf="late() > 0"><i></i>متأخر <b>{{ late() }}</b></span>
          <span class="lamp lamp--due" *ngIf="due() > 0"><i></i>قرّب <b>{{ due() }}</b></span>
          <span class="lamp lamp--ok"><i></i>تمام <b>{{ ok() }}</b></span>
        </div>
      </div>

      <div class="track" *ngIf="months().length">
        <div class="track__head">
          <span>جدول الصيانة على مدار السنة</span>
          <span>{{ year() }}</span>
        </div>
        <ol class="months">
          <li class="month" *ngFor="let month of months()" [class.month--now]="month.current">
            <span class="month__bar">
              <i *ngFor="let mark of month.marks" [class]="'mark mark--' + mark"></i>
            </span>
            <span class="month__label">{{ month.label }}</span>
          </li>
        </ol>
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .panel {
        position: relative;
        overflow: hidden;
        padding: var(--hp-space-5) var(--hp-space-6);
        border-radius: var(--hp-radius-lg);
        background: var(--hp-surface-inverse);
        color: var(--hp-text-inverse);
      }
      /* شبكة خفيفة بتتلاشى ناحية النص — بتدي إحساس لوحة مش كارت */
      .panel::before {
        content: '';
        position: absolute;
        inset: 0;
        opacity: 0.45;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        background-size: 30px 30px;
        -webkit-mask-image: linear-gradient(to left, #000, transparent 65%);
        mask-image: linear-gradient(to left, #000, transparent 65%);
        pointer-events: none;
      }
      .panel > * { position: relative; }

      .panel__top { display: flex; align-items: flex-start; gap: var(--hp-space-5); flex-wrap: wrap; }

      .readout strong {
        display: block;
        font-size: var(--hp-text-2xl);
        font-weight: var(--hp-weight-semi);
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .readout small { font-size: var(--hp-text-sm); color: var(--hp-text-inverse-muted); }

      .lamps { display: flex; gap: var(--hp-space-2); margin-inline-start: auto; flex-wrap: wrap; }
      .lamp {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 11px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--hp-radius-sm);
        background: rgba(255, 255, 255, 0.06);
        font-size: var(--hp-text-xs);
        font-weight: var(--hp-weight-medium);
      }
      .lamp i { width: 7px; height: 7px; border-radius: 50%; flex: none; }
      .lamp b { font-weight: var(--hp-weight-semi); }
      .lamp--ok i { background: var(--hp-ok); box-shadow: 0 0 8px var(--hp-ok); }
      .lamp--due i { background: var(--hp-due); box-shadow: 0 0 8px var(--hp-due); }
      .lamp--late i { background: var(--hp-late); box-shadow: 0 0 8px var(--hp-late); }

      .track {
        margin-top: var(--hp-space-6);
        padding-top: var(--hp-space-4);
        border-top: 1px solid var(--hp-border-inverse);
      }
      .track__head {
        display: flex;
        justify-content: space-between;
        font-size: var(--hp-text-xs);
        color: var(--hp-text-inverse-muted);
        margin-bottom: var(--hp-space-2);
      }

      .months {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 4px;
      }
      .month { text-align: center; }
      .month__bar {
        display: flex;
        flex-direction: column-reverse;
        justify-content: flex-start;
        gap: 2px;
        height: 34px;
        padding: 3px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.07);
      }
      .month--now .month__bar { background: rgba(255, 255, 255, 0.14); outline: 1px solid rgba(255, 255, 255, 0.3); }
      .month__label {
        display: block;
        margin-top: 6px;
        font-size: 10.5px;
        color: var(--hp-text-inverse-muted);
      }
      .month--now .month__label { color: #fff; font-weight: var(--hp-weight-semi); }

      .mark { display: block; height: 6px; border-radius: 2px; }
      .mark--ok { background: var(--hp-ok); }
      .mark--due { background: var(--hp-due); }
      .mark--late { background: var(--hp-late); }
      .mark--planned { background: #5b8fd1; }

      @media (max-width: 760px) {
        .panel { padding: var(--hp-space-4); }
        .months { grid-template-columns: repeat(6, 1fr); gap: 5px; }
        .lamps { margin-inline-start: 0; }
      }
    `,
  ],
})
export class StatusPanelComponent {
  readonly late = input(0);
  readonly due = input(0);
  readonly ok = input(0);
  readonly months = input<MaintenanceMonth[]>([]);
  readonly year = input(new Date().getFullYear());
  /** نص بشري زي "من ساعتين" — مش تاريخ خام. */
  readonly updatedAt = input('');

  readonly headline = computed(() => {
    const needs = this.late() + this.due();
    if (needs === 0) return 'كل حاجة تمام';
    if (needs === 1) return 'حاجة واحدة محتاجاك';
    if (needs === 2) return 'حاجتين محتاجينك';
    return `${needs} حاجات محتاجينك`;
  });

  readonly subline = computed(() => {
    const parts: string[] = [];
    if (this.ok() > 0) parts.push(`باقي ${this.ok()} جهاز حالتهم تمام`);
    if (this.updatedAt()) parts.push(`آخر تحديث ${this.updatedAt()}`);
    return parts.join(' · ');
  });
}
