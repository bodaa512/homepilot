import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { HomeService } from '../../../../core/services/home.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import {
  CreateExpensePayload,
  EXPENSE_CATEGORY_LABELS,
  ExpenseAnalytics,
  ExpenseCategory,
} from '../../../../core/models/expense.model';
import { CategoryBar, groupExpensesByCategory, toCategoryBars } from '../../../../core/utils/expense.util';
import { formatArabicDate, formatArabicNumber, monthRange } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type PageState = 'loading' | 'no-home' | 'ready' | 'error';

interface TransactionRow {
  id: string;
  label: string;
  categoryLabel: string;
  dateLabel: string;
  amountLabel: string;
}

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/**
 * مصاريف البيت — الإجمالي وفئات الصرف من ExpenseService.analytics،
 * وجدول الحركات من ExpenseService.list. زرار "أضف مصروف" بيكلّم
 * ExpenseService.create فعليًا.
 */
@Component({
  selector: 'hp-expense-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <hp-page-header title="المصاريف" [subtitle]="currentMonthLabel">
      <button type="button" class="hp-btn hp-btn--quiet hp-btn--sm" (click)="exportCsv()" [disabled]="!transactions().length">
        تصدير
      </button>
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openCreate()" [disabled]="state() !== 'ready'">
        أضف مصروف
      </button>
    </hp-page-header>

    <ng-container [ngSwitch]="state()">
      <div *ngSwitchCase="'loading'" class="hp-stack">
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
      </div>

      <div *ngSwitchCase="'error'" class="hp-alert hp-alert--error">{{ errorMessage() }}</div>

      <hp-empty-state *ngSwitchCase="'no-home'" title="لسه معملتش بيت" hint="ضيف بيتك الأول من لوحة القيادة قبل ما تسجّل مصاريف.">
        <a class="hp-btn hp-btn--primary" routerLink="/app/home">روح للوحة القيادة</a>
      </hp-empty-state>

      <ng-container *ngSwitchCase="'ready'">
        <div class="cols">
          <div class="hp-block">
            <div class="hp-block__head"><h2>الإجمالي</h2></div>
            <div class="meter">
              <div class="meter__big">{{ totalLabel() }} <span>ج.م</span></div>
              <p class="meter__cap">{{ diffLabel() }}</p>
              <div class="bars" *ngIf="categories().length">
                <div class="barline" *ngFor="let cat of categories()">
                  <span>{{ cat.label }}</span>
                  <span class="trk"><i [style.width.%]="cat.percent" [style.background]="cat.color"></i></span>
                  <span class="val">{{ cat.amountLabel }}</span>
                </div>
              </div>
              <p class="hp-muted" *ngIf="!categories().length">لسه مفيش مصاريف مسجّلة الشهر ده.</p>
            </div>
          </div>

          <div class="hp-block">
            <div class="hp-block__head"><h2>مقارنة بآخر ٣ شهور</h2></div>
            <div class="mini-cols" *ngIf="history().length; else noHistory">
              <div class="mini-col" *ngFor="let m of history()">
                <span class="mini-col__bar" [style.height.%]="m.percent"></span>
                <small>{{ m.label }}</small>
              </div>
            </div>
            <ng-template #noHistory>
              <p class="hp-muted" style="padding: var(--hp-space-4)">لسه مفيش تاريخ كفاية للمقارنة.</p>
            </ng-template>
          </div>
        </div>

        <div class="hp-alert hp-alert--error" *ngIf="actionError()">{{ actionError() }}</div>

        <div class="hp-block" style="margin-top: var(--hp-space-4)" *ngIf="transactions().length; else emptyTx">
          <div class="hp-block__head"><h2>الحركات</h2></div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr><th>البند</th><th>الفئة</th><th>التاريخ</th><th>المبلغ</th><th></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of transactions()">
                  <td>{{ tx.label }}</td>
                  <td>{{ tx.categoryLabel }}</td>
                  <td>{{ tx.dateLabel }}</td>
                  <td class="amount">{{ tx.amountLabel }} ج.م</td>
                  <td>
                    <button
                      type="button"
                      class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger"
                      [disabled]="deletingId() === tx.id"
                      (click)="removeExpense(tx)"
                    >
                      <span class="hp-spin" *ngIf="deletingId() === tx.id"></span>
                      {{ deletingId() === tx.id ? '' : 'احذف' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <ng-template #emptyTx>
          <hp-empty-state title="لسه مفيش مصاريف مسجّلة" hint="ابدأ بتسجيل أول مصروف على البيت." style="margin-top: var(--hp-space-4)">
            <button type="button" class="hp-btn hp-btn--primary" (click)="openCreate()">أضف مصروف</button>
          </hp-empty-state>
        </ng-template>
      </ng-container>
    </ng-container>

    <hp-modal *ngIf="showCreate()" title="أضف مصروف" (closed)="closeCreate()">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field">
          <label for="expAmount">المبلغ (ج.م)</label>
          <input id="expAmount" type="number" min="0" step="0.01" required
            [value]="form.amount()" (input)="form.amount.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="expCategory">الفئة</label>
          <select id="expCategory" [value]="form.category()" (change)="form.category.set($any($event.target).value)">
            <option *ngFor="let opt of categoryOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="expDate">التاريخ</label>
          <input id="expDate" type="date" required [value]="form.date()" (input)="form.date.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="expMethod">طريقة الدفع (اختياري)</label>
          <input id="expMethod" type="text" placeholder="كاش، فيزا..." [value]="form.paymentMethod()" (input)="form.paymentMethod.set($any($event.target).value)" />
        </div>
        <div class="hp-field hp-field--full">
          <label for="expDesc">ملاحظة (اختياري)</label>
          <input id="expDesc" type="text" [value]="form.description()" (input)="form.description.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="button" class="hp-btn hp-btn--ghost" (click)="closeCreate()">إلغاء</button>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? 'بيتم الإضافة...' : 'سجّل المصروف' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      :host { display: block; }

      .cols { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--hp-space-4); }

      .meter { padding: var(--hp-space-4); }
      .meter__big { font-size: var(--hp-text-xl); font-weight: var(--hp-weight-semi); line-height: 1.2; }
      .meter__big span { font-size: var(--hp-text-sm); font-weight: var(--hp-weight-normal); color: var(--hp-text-muted); }
      .meter__cap { font-size: var(--hp-text-xs); color: var(--hp-text-muted); margin: 0 0 var(--hp-space-3); }

      .bars { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .barline { display: grid; grid-template-columns: 78px 1fr 62px; align-items: center; gap: var(--hp-space-2); font-size: var(--hp-text-xs); }
      .barline .trk { height: 7px; border-radius: 4px; background: var(--hp-surface-sunken); border: 1px solid var(--hp-border); overflow: hidden; }
      .barline .trk i { display: block; height: 100%; border-radius: 4px; }
      .barline .val { text-align: end; font-weight: var(--hp-weight-semi); }

      .mini-cols {
        display: flex;
        align-items: flex-end;
        gap: var(--hp-space-4);
        height: 120px;
        padding: var(--hp-space-4);
      }
      .mini-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: var(--hp-space-2); height: 100%; }
      .mini-col__bar { width: 100%; max-width: 40px; border-radius: 4px 4px 0 0; background: var(--hp-navy-700); min-height: 3px; }
      .mini-col small { color: var(--hp-text-muted); font-size: var(--hp-text-xs); }

      .amount { font-weight: var(--hp-weight-semi); font-variant-numeric: tabular-nums; }

      @media (max-width: 900px) {
        .cols { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ExpenseListComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly expenseService = inject(ExpenseService);

  readonly state = signal<PageState>('loading');
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly deletingId = signal<string | null>(null);

  readonly currentMonthLabel = `${MONTH_NAMES[new Date().getMonth()]} ${formatArabicNumber(new Date().getFullYear())}`;

  readonly totalLabel = signal('٠');
  readonly diffLabel = signal('');
  readonly categories = signal<CategoryBar[]>([]);
  readonly history = signal<{ label: string; percent: number }[]>([]);
  readonly transactions = signal<TransactionRow[]>([]);

  readonly categoryOptions = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as ExpenseCategory,
    label,
  }));

  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly form = {
    amount: signal(''),
    category: signal<ExpenseCategory>('miscellaneous'),
    date: signal(new Date().toISOString().slice(0, 10)),
    paymentMethod: signal(''),
    description: signal(''),
  };

  private homeId: string | null = null;

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => {
        this.homeId = this.homeService.activeHomeId();
        if (!this.homeId) {
          this.state.set('no-home');
          return;
        }
        this.fetchData(this.homeId);
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  openCreate(): void {
    this.form.amount.set('');
    this.form.category.set('miscellaneous');
    this.form.date.set(new Date().toISOString().slice(0, 10));
    this.form.paymentMethod.set('');
    this.form.description.set('');
    this.createError.set('');
    this.showCreate.set(true);
  }

  closeCreate(): void {
    if (this.creating()) return;
    this.showCreate.set(false);
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    if (this.creating() || !this.homeId) return;

    const amount = Number(this.form.amount());
    if (!amount || amount <= 0) {
      this.createError.set('لازم تكتب مبلغ صحيح.');
      return;
    }
    if (!this.form.date()) {
      this.createError.set('لازم تختار تاريخ.');
      return;
    }

    const payload: CreateExpensePayload = {
      amount,
      category: this.form.category(),
      date: this.form.date(),
      paymentMethod: this.form.paymentMethod().trim() || undefined,
      description: this.form.description().trim() || undefined,
    };

    this.creating.set(true);
    this.createError.set('');

    this.expenseService.create(this.homeId, payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreate.set(false);
        if (this.homeId) this.fetchData(this.homeId);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err));
      },
    });
  }

  removeExpense(tx: TransactionRow): void {
    if (this.deletingId() || !this.homeId) return;
    this.deletingId.set(tx.id);
    this.actionError.set('');
    this.expenseService.remove(tx.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        // بنعيد تحميل كل حاجة (مش بس نشيل الصف) عشان الإجمالي وتوزيع
        // الفئات والمقارنة الشهرية يفضلوا متطابقين مع الحقيقة.
        if (this.homeId) this.fetchData(this.homeId);
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف المصروف — حاول تاني.'));
      },
    });
  }

  exportCsv(): void {
    const rows = [['البند', 'الفئة', 'التاريخ', 'المبلغ']];
    for (const t of this.transactions()) {
      rows.push([t.label, t.categoryLabel, t.dateLabel, t.amountLabel]);
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'expenses.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private fetchData(homeId: string): void {
    this.state.set('loading');
    forkJoin({
      analytics: this.expenseService.analytics(homeId),
      expenses: this.expenseService.list(homeId),
      thisMonth: this.expenseService.list(homeId, monthRange(0)),
    }).subscribe({
      next: ({ analytics, expenses, thisMonth }) => {
        this.applyAnalytics(analytics);
        this.categories.set(toCategoryBars(groupExpensesByCategory(thisMonth), 5));
        this.transactions.set(
          expenses.slice(0, 25).map((e) => ({
            id: e._id,
            label: e.description || (EXPENSE_CATEGORY_LABELS[e.category] ?? e.category),
            categoryLabel: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
            dateLabel: formatArabicDate(e.date, false),
            amountLabel: formatArabicNumber(e.amount),
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

  /** بيستخدم monthlyTrend بس (إجمالي كل شهر بالظبط) — الفئات بقت بتتحسب من thisMonth في fetchData بدل byCategory اللي بيجمع آخر ١٢ شهر. */
  private applyAnalytics(analytics: ExpenseAnalytics): void {
    const total = analytics.totalThisMonth;
    this.totalLabel.set(formatArabicNumber(total));

    const trend = analytics.monthlyTrend.slice(-3);
    const max = Math.max(1, ...trend.map((t) => t.total));
    this.history.set(
      trend.map((t) => ({
        label: MONTH_NAMES[t.month - 1] ?? '',
        percent: Math.round((t.total / max) * 100),
      })),
    );

    if (trend.length >= 2) {
      const current = trend[trend.length - 1].total;
      const previous = trend[trend.length - 2].total;
      const diff = current - previous;
      const diffLabel = formatArabicNumber(Math.abs(diff));
      if (diff < 0) this.diffLabel.set(`أقل من الشهر اللي فات بـ ${diffLabel} ج.م`);
      else if (diff > 0) this.diffLabel.set(`أكتر من الشهر اللي فات بـ ${diffLabel} ج.م`);
      else this.diffLabel.set('زي الشهر اللي فات تقريبًا');
    } else {
      this.diffLabel.set('لسه مفيش بيانات كفاية للمقارنة بالشهر اللي فات.');
    }
  }
}
