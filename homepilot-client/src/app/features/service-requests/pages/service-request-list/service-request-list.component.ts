import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { HomeService } from '../../../../core/services/home.service';
import { ServiceRequestService } from '../../../../core/services/service-request.service';
import {
  CreateServiceRequestPayload,
  REQUEST_STATUS_LABELS,
  SERVICE_CATEGORY_LABELS,
  ServiceCategory,
  ServiceRequestStatus,
  ServiceRequestUrgency,
  URGENCY_LABELS,
} from '../../../../core/models/service-request.model';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type ReqState = 'loading' | 'no-home' | 'ready' | 'error';

const STATUS_BADGE: Record<ServiceRequestStatus, HpStatus> = {
  REQUESTED: 'neutral',
  REVIEWING: 'neutral',
  OFFERS_RECEIVED: 'due',
  PROVIDER_SELECTED: 'info',
  SCHEDULED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'ok',
  REVIEWED: 'ok',
  CANCELLED: 'neutral',
};

interface RequestRow {
  id: string;
  title: string;
  categoryLabel: string;
  urgencyLabel: string;
  dateLabel: string;
  status: HpStatus;
  statusLabel: string;
}

@Component({
  selector: 'hp-service-request-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, EmptyStateComponent, ModalComponent, StatusBadgeComponent],
  template: `
    <hp-page-header title="طلبات الخدمة" subtitle="اطلب مزوّد خدمة لبيتك، وقارن العروض، واختار الأنسب.">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openForm()" *ngIf="state() === 'ready'">
        + طلب جديد
      </button>
    </hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <hp-empty-state *ngIf="state() === 'no-home'" title="ضيف بيتك الأول" hint="محتاج تعمل بيت الأول من شاشة «بيوتي».">
    </hp-empty-state>

    <div class="hp-stack" *ngIf="state() === 'loading'">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <hp-empty-state
        *ngIf="rows().length === 0"
        title="لسه مفيش طلبات خدمة"
        hint="محتاج سبّاك أو كهربائي أو أي حد يصلّحلك حاجة؟ اطلب هنا وشوف العروض."
      >
        <button type="button" class="hp-btn hp-btn--primary" (click)="openForm()">اطلب أول خدمة</button>
      </hp-empty-state>

      <div class="req-list" *ngIf="rows().length > 0">
        <a class="req-row" *ngFor="let r of rows()" [routerLink]="['/app/service-requests', r.id]">
          <div class="req-row__main">
            <strong>{{ r.title }}</strong>
            <span class="hp-muted">{{ r.categoryLabel }} · {{ r.urgencyLabel }}</span>
          </div>
          <span class="hp-muted">{{ r.dateLabel }}</span>
          <hp-status-badge [status]="r.status" [label]="r.statusLabel"></hp-status-badge>
        </a>
      </div>
    </ng-container>

    <hp-modal *ngIf="showForm()" title="طلب خدمة جديد" (closed)="showForm.set(false)">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field hp-field--full">
          <label for="reqTitle">عنوان الطلب</label>
          <input
            id="reqTitle"
            type="text"
            required
            placeholder="مثلاً: تسريب مياه في الحمام"
            [value]="form.title()"
            (input)="form.title.set($any($event.target).value)"
          />
        </div>
        <div class="hp-field">
          <label for="reqCategory">نوع الخدمة</label>
          <select id="reqCategory" [value]="form.category()" (change)="form.category.set($any($event.target).value)">
            <option *ngFor="let opt of categoryOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="reqUrgency">الاستعجال</label>
          <select id="reqUrgency" [value]="form.urgency()" (change)="form.urgency.set($any($event.target).value)">
            <option *ngFor="let opt of urgencyOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field hp-field--full">
          <label for="reqDesc">تفاصيل (اختياري)</label>
          <textarea
            id="reqDesc"
            rows="3"
            [value]="form.description()"
            (input)="form.description.set($any($event.target).value)"
          ></textarea>
        </div>
        <div class="hp-field">
          <label for="reqBudget">الميزانية المتوقعة (اختياري)</label>
          <input
            id="reqBudget"
            type="number"
            min="0"
            [value]="form.estimatedBudget()"
            (input)="form.estimatedBudget.set($any($event.target).value)"
          />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? 'بيتم الإرسال...' : 'ابعت الطلب' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      .req-list { display: flex; flex-direction: column; gap: var(--hp-space-2); }
      .req-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--hp-space-3);
        padding: var(--hp-space-3) var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        text-decoration: none;
        color: inherit;
      }
      .req-row:hover { border-color: var(--hp-border-strong); }
      .req-row__main { display: flex; flex-direction: column; gap: 2px; }
      @media (max-width: 640px) {
        .req-row { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ServiceRequestListComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly requestService = inject(ServiceRequestService);

  readonly state = signal<ReqState>('loading');
  readonly errorMessage = signal('');
  readonly rows = signal<RequestRow[]>([]);

  readonly showForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly form = {
    title: signal(''),
    category: signal<ServiceCategory>('plumbing'),
    urgency: signal<ServiceRequestUrgency>('medium'),
    description: signal(''),
    estimatedBudget: signal(''),
  };

  readonly categoryOptions = Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as ServiceCategory,
    label,
  }));
  readonly urgencyOptions = Object.entries(URGENCY_LABELS).map(([value, label]) => ({
    value: value as ServiceRequestUrgency,
    label,
  }));

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
    this.requestService.listForHome(homeId).subscribe({
      next: (requests) => {
        this.rows.set(
          requests
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((r) => ({
              id: r._id,
              title: r.title,
              categoryLabel: SERVICE_CATEGORY_LABELS[r.category] ?? r.category,
              urgencyLabel: URGENCY_LABELS[r.urgency] ?? r.urgency,
              dateLabel: formatArabicDate(r.createdAt, false),
              status: STATUS_BADGE[r.status] ?? 'neutral',
              statusLabel: REQUEST_STATUS_LABELS[r.status] ?? r.status,
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

  openForm(): void {
    this.form.title.set('');
    this.form.category.set('plumbing');
    this.form.urgency.set('medium');
    this.form.description.set('');
    this.form.estimatedBudget.set('');
    this.createError.set('');
    this.showForm.set(true);
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    if (this.creating()) return;

    const homeId = this.homeService.activeHomeId();
    const title = this.form.title().trim();
    if (!homeId || !title) {
      this.createError.set('اكتب عنوان الطلب.');
      return;
    }

    const budgetRaw = this.form.estimatedBudget().trim();
    const budget = budgetRaw === '' ? undefined : Number(budgetRaw);
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      this.createError.set('الميزانية لازم تكون رقم صحيح.');
      return;
    }

    this.creating.set(true);
    this.createError.set('');

    const payload: CreateServiceRequestPayload = {
      title,
      category: this.form.category(),
      urgency: this.form.urgency(),
      description: this.form.description().trim() || undefined,
      estimatedBudget: budget,
    };

    this.requestService.create(homeId, payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showForm.set(false);
        this.fetch();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err, 'مقدرناش نبعت الطلب — حاول تاني.'));
      },
    });
  }
}
