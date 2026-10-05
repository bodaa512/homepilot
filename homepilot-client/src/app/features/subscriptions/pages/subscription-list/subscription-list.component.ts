import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HomeService } from '../../../../core/services/home.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { BillingFrequency, CreateSubscriptionPayload, Subscription } from '../../../../core/models/subscription.model';
import { formatArabicDate, formatCurrency, relativeDayLabel } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type SubsState = 'loading' | 'no-home' | 'ready' | 'error';

interface SubscriptionRow {
  id: string;
  name: string;
  category: string;
  priceLabel: string;
  frequencyLabel: string;
  nextBillingLabel: string;
  isActive: boolean;
}

@Component({
  selector: 'hp-subscription-list',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <hp-page-header title="الاشتراكات" [subtitle]="subtitle()">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openForm()" *ngIf="state() === 'ready'">
        + اشتراك جديد
      </button>
    </hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <hp-empty-state *ngIf="state() === 'no-home'" title="ضيف بيت الأول" hint="محتاج تعمل بيت الأول من شاشة «بيوتي».">
    </hp-empty-state>

    <div *ngIf="state() === 'loading'" class="hp-stack">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3, 4]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <div class="hp-alert hp-alert--error" *ngIf="actionError()">{{ actionError() }}</div>

      <hp-empty-state
        *ngIf="rows().length === 0"
        title="لسه مفيش اشتراكات مسجّلة"
        hint="إنترنت، تأمين، صيانة دورية — سجّلها هنا عشان تتابع مواعيد تجديدها."
      >
        <button type="button" class="hp-btn hp-btn--primary" (click)="openForm()">أضف أول اشتراك</button>
      </hp-empty-state>

      <div class="sub-list" *ngIf="rows().length > 0">
        <div class="sub-row" *ngFor="let row of rows()" [class.sub-row--inactive]="!row.isActive">
          <div class="sub-row__main">
            <strong>{{ row.name }}</strong>
            <span class="hp-muted" *ngIf="row.category">{{ row.category }}</span>
          </div>
          <div class="sub-row__price">{{ row.priceLabel }} <span class="hp-muted">/ {{ row.frequencyLabel }}</span></div>
          <div class="sub-row__next hp-muted">{{ row.nextBillingLabel }}</div>
          <div class="sub-row__actions">
            <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="toggleActive(row)">
              {{ row.isActive ? 'وقّف الاشتراك' : 'فعّله تاني' }}
            </button>
            <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger" (click)="remove(row)">
              احذف
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <hp-modal *ngIf="showForm()" title="اشتراك جديد" (closed)="showForm.set(false)">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field hp-field--full">
          <label for="subName">اسم الاشتراك</label>
          <input
            id="subName"
            type="text"
            required
            placeholder="مثلاً: إنترنت WE"
            [value]="form.name()"
            (input)="form.name.set($any($event.target).value)"
          />
        </div>
        <div class="hp-field">
          <label for="subCategory">الفئة (اختياري)</label>
          <input
            id="subCategory"
            type="text"
            list="subCategories"
            placeholder="إنترنت، تأمين، صيانة..."
            [value]="form.category()"
            (input)="form.category.set($any($event.target).value)"
          />
          <datalist id="subCategories">
            <option value="إنترنت"></option>
            <option value="تأمين"></option>
            <option value="صيانة دورية"></option>
            <option value="اشتراك رياضي"></option>
          </datalist>
        </div>
        <div class="hp-field">
          <label for="subFreq">دورية الدفع</label>
          <select id="subFreq" [value]="form.billingFrequency()" (change)="form.billingFrequency.set($any($event.target).value)">
            <option value="monthly">شهريًا</option>
            <option value="yearly">سنويًا</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="subPrice">السعر (ج.م)</label>
          <input
            id="subPrice"
            type="number"
            min="0"
            step="0.01"
            required
            [value]="form.price()"
            (input)="form.price.set($any($event.target).value)"
          />
        </div>
        <div class="hp-field">
          <label for="subDate">تاريخ التجديد الجاي</label>
          <input
            id="subDate"
            type="date"
            required
            [value]="form.nextBillingDate()"
            (input)="form.nextBillingDate.set($any($event.target).value)"
          />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? 'بيتم الإضافة...' : 'أضف الاشتراك' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      .sub-list { display: flex; flex-direction: column; gap: var(--hp-space-2); }
      .sub-row {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr auto;
        align-items: center;
        gap: var(--hp-space-3);
        padding: var(--hp-space-3) var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .sub-row--inactive { opacity: 0.55; }
      .sub-row__main { display: flex; flex-direction: column; gap: 2px; }
      .sub-row__actions { display: flex; gap: var(--hp-space-2); justify-content: flex-end; }
      @media (max-width: 720px) {
        .sub-row { grid-template-columns: 1fr; }
        .sub-row__actions { justify-content: flex-start; }
      }
    `,
  ],
})
export class SubscriptionListComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly subscriptionService = inject(SubscriptionService);

  readonly state = signal<SubsState>('loading');
  readonly errorMessage = signal('');
  readonly actionError = signal('');

  readonly rows = signal<SubscriptionRow[]>([]);
  readonly totalAnnualLabel = signal('');

  readonly showForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly form = {
    name: signal(''),
    category: signal(''),
    price: signal(''),
    billingFrequency: signal<BillingFrequency>('monthly'),
    nextBillingDate: signal(''),
  };

  subtitle(): string {
    return this.state() === 'ready' && this.totalAnnualLabel()
      ? `إجمالي الاشتراكات الفعّالة سنويًا: ${this.totalAnnualLabel()}`
      : '';
  }

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => this.fetch(),
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  fetch(): void {
    const homeId = this.homeService.activeHomeId();
    if (!homeId) {
      this.state.set('no-home');
      return;
    }
    this.state.set('loading');
    this.subscriptionService.list(homeId).subscribe({
      next: (res) => {
        this.totalAnnualLabel.set(formatCurrency(res.totalAnnualCost));
        this.rows.set(
          res.subscriptions.map((s) => ({
            id: s._id,
            name: s.name,
            category: s.category ?? '',
            priceLabel: formatCurrency(s.price, s.currency),
            frequencyLabel: s.billingFrequency === 'monthly' ? 'شهريًا' : 'سنويًا',
            nextBillingLabel: `${relativeDayLabel(s.nextBillingDate).label} (${formatArabicDate(s.nextBillingDate, false)})`,
            isActive: s.isActive,
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

  toggleActive(row: SubscriptionRow): void {
    this.actionError.set('');
    this.subscriptionService.setActive(row.id, !row.isActive).subscribe({
      next: () => this.fetch(),
      error: (err: unknown) => this.actionError.set(apiErrorMessage(err, 'مقدرناش نحدّث الاشتراك — حاول تاني.')),
    });
  }

  remove(row: SubscriptionRow): void {
    this.actionError.set('');
    this.subscriptionService.remove(row.id).subscribe({
      next: () => this.rows.update((list) => list.filter((r) => r.id !== row.id)),
      error: (err: unknown) => this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف الاشتراك — حاول تاني.')),
    });
  }

  openForm(): void {
    this.form.name.set('');
    this.form.category.set('');
    this.form.price.set('');
    this.form.billingFrequency.set('monthly');
    this.form.nextBillingDate.set('');
    this.createError.set('');
    this.showForm.set(true);
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    if (this.creating()) return;

    const homeId = this.homeService.activeHomeId();
    const name = this.form.name().trim();
    const price = Number(this.form.price());
    const nextBillingDate = this.form.nextBillingDate();

    if (!homeId) return;
    if (!name || !nextBillingDate || !Number.isFinite(price) || price < 0) {
      this.createError.set('لازم تملأ الاسم والسعر وتاريخ التجديد صح.');
      return;
    }

    this.creating.set(true);
    this.createError.set('');

    const payload: CreateSubscriptionPayload = {
      name,
      category: this.form.category().trim() || undefined,
      price,
      billingFrequency: this.form.billingFrequency(),
      nextBillingDate,
    };

    this.subscriptionService.create(homeId, payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showForm.set(false);
        this.fetch();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err, 'مقدرناش نضيف الاشتراك — حاول تاني.'));
      },
    });
  }
}
