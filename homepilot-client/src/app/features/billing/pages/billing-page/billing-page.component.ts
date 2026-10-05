import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { AuthService } from '../../../../core/services/auth.service';
import { BillingService } from '../../../../core/services/billing.service';
import { PaymentRecord, Plan, PlanCode } from '../../../../core/models/billing.model';
import { formatArabicDate, formatArabicNumber } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type BillingState = 'loading' | 'ready' | 'error';

interface PlanView {
  code: PlanCode;
  name: string;
  priceLabel: string;
  features: string[];
  homesLabel: string;
  isCurrent: boolean;
  canUpgrade: boolean;
}

interface PaymentView {
  id: string;
  planName: string;
  amountLabel: string;
  dateLabel: string;
  status: HpStatus;
  statusLabel: string;
}

const PAYMENT_STATUS: Record<PaymentRecord['status'], { status: HpStatus; label: string }> = {
  succeeded: { status: 'ok', label: 'ناجحة' },
  pending: { status: 'due', label: 'قيد الانتظار' },
  failed: { status: 'late', label: 'فشلت' },
  refunded: { status: 'neutral', label: 'مُستردة' },
};

/**
 * الاشتراك والفواتير — الباقات من السيرفر، والترقية بتفتح صفحة Stripe
 * (السيرفر هو اللي بيعمل الـ checkout session). لما Stripe يرجّعك
 * بـ ?status=success بنحدّث الجلسة عشان الباقة الجديدة تظهر.
 */
@Component({
  selector: 'hp-billing-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <hp-page-header title="الاشتراك والفواتير" subtitle="باقتك الحالية، وترقية حسابك، وتاريخ المدفوعات."></hp-page-header>

    <div class="hp-alert hp-alert--info" *ngIf="banner()">{{ banner() }}</div>
    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>
    <div class="hp-alert hp-alert--error" *ngIf="checkoutError()">{{ checkoutError() }}</div>

    <div class="plans" *ngIf="state() === 'loading'">
      <div class="hp-skeleton" style="height: 240px" *ngFor="let i of [1, 2, 3]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <div class="plans">
        <div class="plan" *ngFor="let p of plans()" [class.plan--current]="p.isCurrent">
          <div class="plan__top">
            <h3>{{ p.name }}</h3>
            <span class="hp-badge hp-badge--ok" *ngIf="p.isCurrent">باقتك الحالية</span>
          </div>
          <div class="plan__price">{{ p.priceLabel }}</div>
          <p class="hp-muted">{{ p.homesLabel }}</p>
          <ul>
            <li *ngFor="let f of p.features">{{ f }}</li>
          </ul>
          <button
            type="button"
            class="hp-btn hp-btn--accent"
            *ngIf="p.canUpgrade"
            [disabled]="checkoutCode() !== null"
            (click)="upgrade(p.code)"
          >
            <span class="hp-spin" *ngIf="checkoutCode() === p.code"></span>
            {{ checkoutCode() === p.code ? 'بنحوّلك للدفع...' : 'رقّي لـ ' + p.name }}
          </button>
        </div>
      </div>

      <h2 class="section-title">تاريخ المدفوعات</h2>
      <p class="hp-muted" *ngIf="payments().length === 0">لسه مفيش مدفوعات.</p>
      <div class="pay-list" *ngIf="payments().length > 0">
        <div class="pay-row" *ngFor="let pay of payments()">
          <strong>{{ pay.planName }}</strong>
          <span>{{ pay.amountLabel }}</span>
          <span class="hp-muted">{{ pay.dateLabel }}</span>
          <hp-status-badge [status]="pay.status" [label]="pay.statusLabel"></hp-status-badge>
        </div>
      </div>
    </ng-container>
  `,
  styles: [
    `
      .plans { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--hp-space-4); }
      .plan {
        display: flex;
        flex-direction: column;
        gap: var(--hp-space-2);
        padding: var(--hp-space-5);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .plan--current { border-color: var(--hp-ok); box-shadow: 0 0 0 1px var(--hp-ok) inset; }
      .plan__top { display: flex; align-items: center; justify-content: space-between; gap: var(--hp-space-2); }
      .plan__price { font-size: var(--hp-text-xl); font-weight: var(--hp-weight-semi); }
      .plan ul { margin: 0; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
      .plan > button { margin-top: var(--hp-space-3); }
      .section-title { font-size: var(--hp-text-lg); margin: var(--hp-space-6) 0 var(--hp-space-3); }
      .pay-list { display: flex; flex-direction: column; gap: var(--hp-space-2); }
      .pay-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr auto;
        align-items: center;
        gap: var(--hp-space-3);
        padding: var(--hp-space-3) var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      @media (max-width: 640px) {
        .pay-row { grid-template-columns: 1fr 1fr; }
      }
    `,
  ],
})
export class BillingPageComponent implements OnInit {
  private readonly billing = inject(BillingService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<BillingState>('loading');
  readonly errorMessage = signal('');
  readonly banner = signal('');
  readonly checkoutError = signal('');
  readonly checkoutCode = signal<PlanCode | null>(null);

  private readonly rawPlans = signal<Plan[]>([]);
  readonly payments = signal<PaymentView[]>([]);

  readonly plans = computed<PlanView[]>(() => {
    const current = this.auth.user()?.planCode ?? 'free';
    return this.rawPlans().map((p) => ({
      code: p.code,
      name: p.name,
      priceLabel: p.priceMonthly === 0 ? 'مجانًا' : `${formatArabicNumber(p.priceMonthly)} دولار / شهريًا`,
      features: p.features,
      homesLabel: p.limits.homes === -1 ? 'عدد بيوت غير محدود' : `حتى ${formatArabicNumber(p.limits.homes)} بيت`,
      isCurrent: p.code === current,
      canUpgrade: p.code !== 'free' && p.code !== current,
    }));
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'success') {
      this.banner.set('تمام! الدفع تم — بنحدّث باقتك (ممكن ياخد لحظات لحد ما Stripe يأكّد).');
      // الويب هوك على السيرفر هو اللي بيغيّر الباقة؛ نجيب بيانات المستخدم من جديد.
      this.auth.refresh().subscribe({ error: () => undefined });
    } else if (status === 'cancelled') {
      this.banner.set('اتلغت عملية الدفع — مفيش أي مبلغ اتسحب.');
    }
    this.fetch();
  }

  fetch(): void {
    this.state.set('loading');
    forkJoin({ plans: this.billing.plans(), history: this.billing.history() }).subscribe({
      next: ({ plans, history }) => {
        this.rawPlans.set(plans);
        this.payments.set(
          history.map((h) => ({
            id: h._id,
            planName: h.plan?.name ?? '—',
            amountLabel: `${formatArabicNumber(h.amount)} ${h.currency.toUpperCase() === 'USD' ? 'دولار' : h.currency}`,
            dateLabel: formatArabicDate(h.createdAt, true),
            status: PAYMENT_STATUS[h.status].status,
            statusLabel: PAYMENT_STATUS[h.status].label,
          })),
        );
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  upgrade(code: PlanCode): void {
    if (code === 'free' || this.checkoutCode()) return;
    this.checkoutError.set('');
    this.checkoutCode.set(code);
    this.billing.checkout(code).subscribe({
      next: ({ url }) => {
        if (url) window.location.href = url;
        else {
          this.checkoutCode.set(null);
          this.checkoutError.set('السيرفر مرجّعش رابط دفع.');
        }
      },
      error: (err: unknown) => {
        this.checkoutCode.set(null);
        this.checkoutError.set(apiErrorMessage(err, 'مقدرناش نفتح صفحة الدفع — اتأكد إن مفاتيح Stripe متظبطة على السيرفر.'));
      },
    });
  }
}
