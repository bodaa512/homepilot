import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MaintenanceMonth, StatusPanelComponent } from '../../../../shared/ui/status-panel.component';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { HomeService } from '../../../../core/services/home.service';
import { MaintenanceService } from '../../../../core/services/maintenance.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { DocumentService } from '../../../../core/services/document.service';
import { MaintenanceTask } from '../../../../core/models/maintenance.model';
import { HpDocument } from '../../../../core/models/document.model';
import { ExpenseAnalytics } from '../../../../core/models/expense.model';
import { HOME_TYPE_LABELS, HomeType } from '../../../../core/models/home.model';
import { documentStatusView, maintenanceStatusView } from '../../../../core/utils/status.util';
import { CategoryBar, groupExpensesByCategory, toCategoryBars } from '../../../../core/utils/expense.util';
import { formatArabicDate, formatArabicNumber, monthRange, relativeDayLabel } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

interface DashboardTaskView {
  id: string;
  title: string;
  meta: string;
  status: HpStatus;
  badgeLabel: string;
  whenLabel: string;
  dateLabel: string;
}

interface DashboardDocumentView {
  id: string;
  title: string;
  meta: string;
  status: HpStatus;
  badgeLabel: string;
}

type DashboardState = 'loading' | 'no-home' | 'ready' | 'error';

const MONTH_LABELS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

/**
 * لوحة القيادة — أول شاشة بعد الدخول.
 * البيانات كلها حقيقية دلوقتي: المهام من MaintenanceService، المصاريف
 * من ExpenseService.analytics، المستندات من DocumentService — مربوطة
 * بالبيت المفعّل في HomeService. لو المستخدم لسه معملوش بيت، الشاشة
 * بتعرض فورم إضافة بيت بدل المحتوى الفاضي.
 */
@Component({
  selector: 'hp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusPanelComponent, StatusBadgeComponent],
  template: `
    <ng-container [ngSwitch]="state()">
      <div *ngSwitchCase="'loading'" class="hp-stack">
        <div class="hp-skeleton" style="height: 140px; border-radius: var(--hp-radius-lg)"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
      </div>

      <div *ngSwitchCase="'error'" class="hp-alert hp-alert--error">{{ errorMessage() }}</div>

      <div *ngSwitchCase="'no-home'" class="hp-block onboarding">
        <div class="hp-block__body">
          <h2>ضيف بيتك الأول</h2>
          <p class="hp-muted">لسه معملتش أي بيت — ضيف بياناته الأساسية وابدأ تسجّل أجهزتك ومصاريفك وصيانتك.</p>

          <div class="hp-alert hp-alert--error" *ngIf="homeError()">{{ homeError() }}</div>

          <form class="hp-form-grid" (submit)="createHome($event)">
            <div class="hp-field hp-field--full">
              <label for="homeName">اسم البيت</label>
              <input
                id="homeName"
                type="text"
                required
                placeholder="مثلاً: شقة المعادي"
                [value]="homeName()"
                (input)="homeName.set($any($event.target).value)"
              />
            </div>
            <div class="hp-field">
              <label for="homeType">نوع البيت</label>
              <select id="homeType" [value]="homeType()" (change)="homeType.set($any($event.target).value)">
                <option *ngFor="let opt of homeTypeOptions" [value]="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="hp-field">
              <label for="homeCity">المدينة (اختياري)</label>
              <input
                id="homeCity"
                type="text"
                [value]="homeCity()"
                (input)="homeCity.set($any($event.target).value)"
              />
            </div>
            <div class="hp-form-actions hp-field--full">
              <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creatingHome()">
                <span class="hp-spin" *ngIf="creatingHome()"></span>
                {{ creatingHome() ? 'بيتم الإضافة...' : 'أضف البيت' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ng-container *ngSwitchCase="'ready'">
        <hp-status-panel [late]="late()" [due]="due()" [ok]="ok()" [months]="months()" [updatedAt]="updatedAtLabel()" />

        <div class="cols">
          <div class="hp-block">
            <div class="hp-block__head">
              <h2>المهام الجاية</h2>
              <span class="hp-spacer"></span>
              <a routerLink="/app/maintenance">كل المهام</a>
            </div>
            <div class="hp-row" *ngFor="let task of tasks()">
              <span [class]="'hp-tick hp-tick--' + task.status"></span>
              <div class="hp-row__main">
                <b>{{ task.title }}</b>
                <small>{{ task.meta }}</small>
              </div>
              <hp-status-badge [status]="task.status" [label]="task.badgeLabel" />
              <div [class]="'when when--' + task.status">
                {{ task.whenLabel }}
                <small>{{ task.dateLabel }}</small>
              </div>
            </div>
            <p class="hp-muted hp-row-empty" *ngIf="!tasks().length">لسه مفيش مهام صيانة مسجّلة.</p>
          </div>

          <div class="hp-stack">
            <div class="hp-block">
              <div class="hp-block__head"><h2>مصاريف الشهر</h2></div>
              <div class="meter">
                <div class="meter__big">{{ expenseTotalLabel() }} <span>ج.م</span></div>
                <p class="meter__cap">{{ expenseDiffLabel() }}</p>
                <div class="bars" *ngIf="expenseCategories().length">
                  <div class="barline" *ngFor="let cat of expenseCategories()">
                    <span>{{ cat.label }}</span>
                    <span class="trk"><i [style.width.%]="cat.percent" [style.background]="cat.color"></i></span>
                    <span class="val">{{ cat.amountLabel }}</span>
                  </div>
                </div>
                <p class="hp-muted" *ngIf="!expenseCategories().length">لسه مفيش مصاريف مسجّلة الشهر ده.</p>
              </div>
            </div>

            <div class="hp-block">
              <div class="hp-block__head">
                <h2>آخر المستندات</h2>
                <span class="hp-spacer"></span>
                <a routerLink="/app/documents">الأرشيف</a>
              </div>
              <div class="hp-row" *ngFor="let doc of documents()">
                <span [class]="'hp-tick hp-tick--' + doc.status"></span>
                <div class="hp-row__main">
                  <b>{{ doc.title }}</b>
                  <small class="hp-mono">{{ doc.meta }}</small>
                </div>
                <hp-status-badge [status]="doc.status" [label]="doc.badgeLabel" />
              </div>
              <p class="hp-muted hp-row-empty" *ngIf="!documents().length">لسه مفيش مستندات مرفوعة.</p>
            </div>
          </div>
        </div>
      </ng-container>
    </ng-container>
  `,
  styles: [
    `
      :host { display: block; }

      .onboarding { max-width: 560px; }
      .onboarding h2 { margin-bottom: 4px; }
      .onboarding > .hp-block__body > p { margin-bottom: var(--hp-space-5); }

      .cols { display: grid; grid-template-columns: 1.35fr 1fr; gap: var(--hp-space-4); margin-top: var(--hp-space-4); }

      .hp-row-empty { padding: var(--hp-space-5); text-align: center; }

      .when { font-size: var(--hp-text-xs); font-weight: var(--hp-weight-semi); text-align: end; flex: none; }
      .when small { display: block; font-weight: var(--hp-weight-normal); color: var(--hp-text-muted); }
      .when--late { color: var(--hp-late-text); }
      .when--due { color: var(--hp-due-text); }
      .when--ok { color: var(--hp-ok-text); }

      .meter { padding: var(--hp-space-4); }
      .meter__big { font-size: var(--hp-text-xl); font-weight: var(--hp-weight-semi); line-height: 1.2; }
      .meter__big span { font-size: var(--hp-text-sm); font-weight: var(--hp-weight-normal); color: var(--hp-text-muted); }
      .meter__cap { font-size: var(--hp-text-xs); color: var(--hp-text-muted); margin: 0 0 var(--hp-space-3); }

      .bars { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .barline { display: grid; grid-template-columns: 78px 1fr 62px; align-items: center; gap: var(--hp-space-2); font-size: var(--hp-text-xs); }
      .barline .trk { height: 7px; border-radius: 4px; background: var(--hp-surface-sunken); border: 1px solid var(--hp-border); overflow: hidden; }
      .barline .trk i { display: block; height: 100%; border-radius: 4px; }
      .barline .val { text-align: end; font-weight: var(--hp-weight-semi); }

      @media (max-width: 900px) {
        .cols { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly expenseService = inject(ExpenseService);
  private readonly documentService = inject(DocumentService);

  readonly state = signal<DashboardState>('loading');
  readonly errorMessage = signal('');

  readonly homeTypeOptions = Object.entries(HOME_TYPE_LABELS).map(([value, label]) => ({
    value: value as HomeType,
    label,
  }));
  readonly homeName = signal('');
  readonly homeType = signal<HomeType>('apartment');
  readonly homeCity = signal('');
  readonly creatingHome = signal(false);
  readonly homeError = signal('');

  readonly tasks = signal<DashboardTaskView[]>([]);
  readonly documents = signal<DashboardDocumentView[]>([]);
  readonly months = signal<MaintenanceMonth[]>([]);
  readonly expenseCategories = signal<CategoryBar[]>([]);
  readonly expenseTotalLabel = signal('٠');
  readonly expenseDiffLabel = signal('');
  readonly updatedAtLabel = signal('');

  // العدّادات دي لازم تتحسب من كل مهام الصيانة، مش بس أول ٤ الظاهرين في
  // القائمة تحت — وإلا لوحة القيادة تبان "تمام" حتى لو فيه ١٠ مهام متأخرة.
  readonly late = signal(0);
  readonly due = signal(0);
  readonly ok = signal(0);

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => this.afterHomesLoaded(),
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  createHome(event: Event): void {
    event.preventDefault();
    if (this.creatingHome()) return;

    const name = this.homeName().trim();
    if (!name) {
      this.homeError.set('لازم تكتب اسم للبيت.');
      return;
    }

    this.homeError.set('');
    this.creatingHome.set(true);

    this.homeService
      .create({ name, type: this.homeType(), city: this.homeCity().trim() || undefined })
      .subscribe({
        next: (home) => {
          this.creatingHome.set(false);
          this.loadHomeData(home._id);
        },
        error: (err: unknown) => {
          this.creatingHome.set(false);
          this.homeError.set(apiErrorMessage(err));
        },
      });
  }

  private afterHomesLoaded(): void {
    const homeId = this.homeService.activeHomeId();
    if (!homeId) {
      this.state.set('no-home');
      return;
    }
    this.loadHomeData(homeId);
  }

  private loadHomeData(homeId: string): void {
    this.state.set('loading');
    forkJoin({
      tasks: this.maintenanceService.list(homeId),
      analytics: this.expenseService.analytics(homeId),
      thisMonthExpenses: this.expenseService.list(homeId, monthRange(0)),
      documents: this.documentService.list(homeId),
    }).subscribe({
      next: ({ tasks, analytics, thisMonthExpenses, documents }) => {
        this.applyTasks(tasks);
        this.applyExpenses(analytics);
        this.expenseCategories.set(toCategoryBars(groupExpensesByCategory(thisMonthExpenses), 4));
        this.applyDocuments(documents);
        this.updatedAtLabel.set('الآن');
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  private applyTasks(tasks: MaintenanceTask[]): void {
    const openTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'SKIPPED',
    );

    // العدّادات في الأعلى بتتحسب من كل المهام (مش بس الأربعة الظاهرين تحت).
    let lateCount = 0;
    let dueCount = 0;
    let okCount = 0;
    for (const task of tasks) {
      if (task.status === 'COMPLETED') {
        okCount += 1;
        continue;
      }
      if (task.status === 'CANCELLED' || task.status === 'SKIPPED') continue;
      const view = maintenanceStatusView(task.status, task.dueDate);
      if (view.status === 'late') lateCount += 1;
      else if (view.status === 'due') dueCount += 1;
    }
    this.late.set(lateCount);
    this.due.set(dueCount);
    this.ok.set(okCount);

    const view: DashboardTaskView[] = openTasks
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4)
      .map((task) => {
        const statusView = maintenanceStatusView(task.status, task.dueDate);
        const rel = relativeDayLabel(task.dueDate);
        return {
          id: task._id,
          title: task.title,
          meta: [task.asset?.name, task.description].filter(Boolean).join(' · ') || 'مهمة صيانة',
          status: statusView.status,
          badgeLabel: statusView.label,
          whenLabel: rel.label,
          dateLabel: formatArabicDate(task.dueDate, false),
        };
      });
    this.tasks.set(view);

    // شريط السنة: كل مهمة في السنة الحالية بتتحط في شهرها بحالة مبسّطة.
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const buckets: MaintenanceMonth[] = MONTH_LABELS.map((label, index) => ({
      label,
      marks: [],
      current: index === currentMonthIndex,
    }));

    for (const task of tasks) {
      const due = new Date(task.dueDate);
      if (due.getFullYear() !== currentYear) continue;
      const mark = this.trackMarkFor(task);
      if (mark) buckets[due.getMonth()].marks.push(mark);
    }
    this.months.set(buckets);
  }

  private trackMarkFor(task: MaintenanceTask): 'ok' | 'due' | 'late' | 'planned' | null {
    if (task.status === 'COMPLETED') return 'ok';
    if (task.status === 'CANCELLED' || task.status === 'SKIPPED') return null;
    if (task.status === 'OVERDUE') return 'late';
    const { days } = relativeDayLabel(task.dueDate);
    if (days < 0) return 'late';
    if (days <= 7) return 'due';
    return 'planned';
  }

  /** الإجمالي والمقارنة بالشهر اللي فات من analytics — تفصيل الفئات بقى بيتحسب في loadHomeData من مصاريف الشهر الحالي فعليًا (مش تجميع آخر ١٢ شهر). */
  private applyExpenses(analytics: ExpenseAnalytics): void {
    const total = analytics.totalThisMonth;
    this.expenseTotalLabel.set(formatArabicNumber(total));

    const trend = analytics.monthlyTrend;
    const current = trend.length ? trend[trend.length - 1].total : total;
    const previous = trend.length >= 2 ? trend[trend.length - 2].total : null;

    if (previous === null) {
      this.expenseDiffLabel.set('لسه مفيش بيانات كفاية للمقارنة بالشهر اللي فات.');
      return;
    }
    const diff = current - previous;
    const diffLabel = formatArabicNumber(Math.abs(diff));
    if (diff < 0) this.expenseDiffLabel.set(`أقل من الشهر اللي فات بـ ${diffLabel} ج.م`);
    else if (diff > 0) this.expenseDiffLabel.set(`أكتر من الشهر اللي فات بـ ${diffLabel} ج.م`);
    else this.expenseDiffLabel.set('زي الشهر اللي فات تقريبًا');
  }

  private applyDocuments(docs: HpDocument[]): void {
    const view: DashboardDocumentView[] = docs.slice(0, 3).map((doc) => {
      const statusView = documentStatusView(doc.expirationDate);
      return {
        id: doc._id,
        title: doc.originalName,
        meta: doc.expirationDate ? `ساري لـ ${formatArabicDate(doc.expirationDate)}` : formatArabicDate(doc.createdAt),
        status: statusView.status,
        badgeLabel: statusView.label,
      };
    });
    this.documents.set(view);
  }
}
