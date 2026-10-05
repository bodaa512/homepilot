import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { HomeService } from '../../../../core/services/home.service';
import { MaintenanceService } from '../../../../core/services/maintenance.service';
import { CreateMaintenanceTaskPayload, MaintenanceTask } from '../../../../core/models/maintenance.model';
import { maintenanceStatusView } from '../../../../core/utils/status.util';
import { formatArabicDate, relativeDayLabel } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type Filter = 'all' | 'late' | 'due' | 'done';
type PageState = 'loading' | 'no-home' | 'ready' | 'error';

interface TaskRow {
  id: string;
  title: string;
  meta: string;
  status: HpStatus;
  statusLabel: string;
  whenLabel: string;
  dateLabel: string;
  done: boolean;
}

/**
 * كل مهام الصيانة — مربوطة بـ MaintenanceService الحقيقي. الفلاتر
 * (متأخرة/قرّبت/منجزة) بتتحدد من status الفعلي وdueDate، و"علّم
 * كمنجزة" بينادي PATCH /maintenance/:id/complete على السيرفر.
 */
@Component({
  selector: 'hp-task-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <hp-page-header title="الصيانة" [subtitle]="subtitle()">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openCreate()" [disabled]="state() !== 'ready'">
        مهمة جديدة
      </button>
    </hp-page-header>

    <ng-container [ngSwitch]="state()">
      <div *ngSwitchCase="'loading'" class="hp-stack">
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
      </div>

      <div *ngSwitchCase="'error'" class="hp-alert hp-alert--error">{{ errorMessage() }}</div>

      <hp-empty-state *ngSwitchCase="'no-home'" title="لسه معملتش بيت" hint="ضيف بيتك الأول من لوحة القيادة قبل ما تضيف مهام صيانة.">
        <a class="hp-btn hp-btn--primary" routerLink="/app/home">روح للوحة القيادة</a>
      </hp-empty-state>

      <ng-container *ngSwitchCase="'ready'">
        <div class="hp-alert hp-alert--error" *ngIf="actionError()" style="margin-bottom: var(--hp-space-3)">
          {{ actionError() }}
        </div>

        <div class="hp-cluster" style="margin-bottom: var(--hp-space-3)">
          <button
            type="button"
            *ngFor="let f of filters"
            class="hp-chip"
            [class.hp-chip--on]="filter() === f.value"
            (click)="filter.set(f.value)"
          >
            {{ f.label }}
          </button>
        </div>

        <div class="hp-block" *ngIf="filtered().length; else empty">
          <div class="hp-row" *ngFor="let task of filtered()">
            <span [class]="'hp-tick hp-tick--' + task.status"></span>
            <div class="hp-row__main">
              <b [class.done]="task.done">{{ task.title }}</b>
              <small>{{ task.meta }}</small>
            </div>
            <hp-status-badge [status]="task.status" [label]="task.statusLabel" />
            <div class="when">
              {{ task.whenLabel }}
              <small>{{ task.dateLabel }}</small>
            </div>
            <button
              type="button"
              class="hp-btn hp-btn--quiet hp-btn--sm"
              *ngIf="!task.done"
              (click)="markDone(task)"
              [disabled]="completingId() === task.id"
            >
              <span class="hp-spin" *ngIf="completingId() === task.id"></span>
              {{ completingId() === task.id ? '...' : 'علّم كمنجزة' }}
            </button>
            <button
              type="button"
              class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger"
              [disabled]="deletingId() === task.id"
              (click)="removeTask(task)"
            >
              <span class="hp-spin" *ngIf="deletingId() === task.id"></span>
              {{ deletingId() === task.id ? '' : 'احذف' }}
            </button>
          </div>
        </div>

        <ng-template #empty>
          <hp-empty-state title="مفيش مهام في الفلتر ده" hint="جرّب فلتر تاني، أو ضيف مهمة صيانة جديدة.">
            <button type="button" class="hp-btn hp-btn--primary" (click)="openCreate()">مهمة جديدة</button>
          </hp-empty-state>
        </ng-template>
      </ng-container>
    </ng-container>

    <hp-modal *ngIf="showCreate()" title="مهمة صيانة جديدة" (closed)="closeCreate()">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field hp-field--full">
          <label for="taskTitle">عنوان المهمة</label>
          <input id="taskTitle" type="text" required placeholder="مثلاً: تنظيف فلاتر التكييف"
            [value]="form.title()" (input)="form.title.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="taskDue">تاريخ الاستحقاق</label>
          <input id="taskDue" type="date" required [value]="form.dueDate()" (input)="form.dueDate.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="taskRecur">تتكرر كل (أيام، اختياري)</label>
          <input id="taskRecur" type="number" min="1" placeholder="مثلاً: 180"
            [value]="form.recurrenceIntervalDays()" (input)="form.recurrenceIntervalDays.set($any($event.target).value)" />
        </div>
        <div class="hp-field hp-field--full">
          <label for="taskDesc">تفاصيل (اختياري)</label>
          <input id="taskDesc" type="text" [value]="form.description()" (input)="form.description.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="button" class="hp-btn hp-btn--ghost" (click)="closeCreate()">إلغاء</button>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? 'بيتم الإضافة...' : 'أضف المهمة' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      :host { display: block; }

      .when { font-size: var(--hp-text-xs); font-weight: var(--hp-weight-semi); text-align: end; flex: none; color: var(--hp-text); }
      .when small { display: block; font-weight: var(--hp-weight-normal); color: var(--hp-text-muted); }

      .done { color: var(--hp-text-muted); text-decoration: line-through; text-decoration-color: var(--hp-border-strong); }
    `,
  ],
})
export class TaskListComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly maintenanceService = inject(MaintenanceService);

  readonly state = signal<PageState>('loading');
  readonly errorMessage = signal('');
  readonly tasks = signal<TaskRow[]>([]);

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'late', label: 'متأخرة' },
    { value: 'due', label: 'قرّبت' },
    { value: 'done', label: 'منجزة' },
  ];
  readonly filter = signal<Filter>('all');

  readonly subtitle = computed(() =>
    this.state() === 'ready' ? `${this.tasks().filter((t) => !t.done).length} مهمة لسه مفتوحة` : '',
  );

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.tasks();
    if (f === 'done') return this.tasks().filter((t) => t.done);
    return this.tasks().filter((t) => t.status === f && !t.done);
  });

  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly completingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly actionError = signal('');
  readonly form = {
    title: signal(''),
    dueDate: signal(''),
    recurrenceIntervalDays: signal(''),
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
        this.fetchTasks(this.homeId);
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  openCreate(): void {
    this.form.title.set('');
    this.form.dueDate.set('');
    this.form.recurrenceIntervalDays.set('');
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

    const title = this.form.title().trim();
    if (!title || !this.form.dueDate()) {
      this.createError.set('لازم تكتب عنوان وتاريخ استحقاق.');
      return;
    }

    const payload: CreateMaintenanceTaskPayload = {
      title,
      dueDate: this.form.dueDate(),
      description: this.form.description().trim() || undefined,
      recurrenceIntervalDays: this.form.recurrenceIntervalDays() ? Number(this.form.recurrenceIntervalDays()) : undefined,
    };

    this.creating.set(true);
    this.createError.set('');

    this.maintenanceService.create(this.homeId, payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreate.set(false);
        if (this.homeId) this.fetchTasks(this.homeId);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err));
      },
    });
  }

  markDone(task: TaskRow): void {
    if (this.completingId()) return;
    this.completingId.set(task.id);
    this.actionError.set('');
    this.maintenanceService.complete(task.id).subscribe({
      next: () => {
        this.completingId.set(null);
        this.tasks.update((list) =>
          list.map((t) => (t.id === task.id ? { ...t, done: true, status: 'ok' as const, statusLabel: 'منجزة' } : t)),
        );
      },
      error: (err: unknown) => {
        this.completingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نعلّمها كمنجزة — حاول تاني.'));
      },
    });
  }

  removeTask(task: TaskRow): void {
    if (this.deletingId()) return;
    this.deletingId.set(task.id);
    this.actionError.set('');
    this.maintenanceService.remove(task.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.tasks.update((list) => list.filter((t) => t.id !== task.id));
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف المهمة — حاول تاني.'));
      },
    });
  }

  private fetchTasks(homeId: string): void {
    this.state.set('loading');
    this.maintenanceService.list(homeId).subscribe({
      next: (tasks: MaintenanceTask[]) => {
        this.tasks.set(tasks.map((t) => this.toRow(t)));
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  private toRow(task: MaintenanceTask): TaskRow {
    const statusView = maintenanceStatusView(task.status, task.dueDate);
    const rel = relativeDayLabel(task.dueDate);
    return {
      id: task._id,
      title: task.title,
      meta: [task.asset?.name, task.description].filter(Boolean).join(' · ') || 'مهمة صيانة',
      status: statusView.status,
      statusLabel: statusView.label,
      whenLabel: rel.label,
      dateLabel: formatArabicDate(task.dueDate, false),
      done: task.status === 'COMPLETED',
    };
  }
}
