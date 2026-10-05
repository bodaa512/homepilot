import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HomeService } from '../../../../core/services/home.service';
import { CalendarService } from '../../../../core/services/calendar.service';
import { CALENDAR_EVENT_META, CalendarEvent } from '../../../../core/models/calendar.model';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type CalState = 'loading' | 'no-home' | 'ready' | 'error';

interface DayEventView {
  title: string;
  icon: string;
  color: string;
}

interface DayGroup {
  dateLabel: string;
  isToday: boolean;
  events: DayEventView[];
}

/**
 * التقويم بشكل "أجندة": أحداث الشهر مجمّعة حسب اليوم (صيانة، مواعيد،
 * تجديد اشتراكات، انتهاء ضمانات) — السيرفر بيرجّعهم مدموجين ومترتبين
 * جاهزين (GET /homes/:homeId/calendar).
 */
@Component({
  selector: 'hp-calendar-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <hp-page-header title="التقويم" [subtitle]="monthLabel()">
      <div class="hp-cluster">
        <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="nextMonth()">الشهر الجاي ‹</button>
        <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="thisMonth()">الشهر ده</button>
        <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="prevMonth()">› الشهر اللي فات</button>
      </div>
    </hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <hp-empty-state *ngIf="state() === 'no-home'" title="ضيف بيتك الأول" hint="محتاج تعمل بيت الأول من شاشة «بيوتي».">
    </hp-empty-state>

    <div class="hp-stack" *ngIf="state() === 'loading'">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3, 4]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <hp-empty-state
        *ngIf="groups().length === 0"
        title="مفيش أحداث في الشهر ده"
        hint="مواعيد الصيانة وتجديد الاشتراكات وانتهاء الضمانات هتظهر هنا تلقائي."
      ></hp-empty-state>

      <div class="agenda" *ngIf="groups().length > 0">
        <div class="agenda__day" *ngFor="let g of groups()" [class.agenda__day--today]="g.isToday">
          <div class="agenda__date">
            {{ g.dateLabel }}
            <span class="hp-badge hp-badge--info" *ngIf="g.isToday">النهاردة</span>
          </div>
          <div class="agenda__events">
            <div class="agenda__event" *ngFor="let ev of g.events">
              <span class="agenda__dot" [style.background]="ev.color"></span>
              <span class="agenda__icon">{{ ev.icon }}</span>
              <span>{{ ev.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="legend" *ngIf="groups().length > 0">
        <span>🔧 صيانة</span>
        <span>📅 موعد</span>
        <span>🔁 تجديد اشتراك</span>
        <span>🛡️ انتهاء ضمان</span>
      </div>
    </ng-container>
  `,
  styles: [
    `
      .agenda { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .agenda__day {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: var(--hp-space-4);
        padding: var(--hp-space-3) var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .agenda__day--today { border-color: var(--hp-info); box-shadow: 0 0 0 1px var(--hp-info) inset; }
      .agenda__date {
        font-weight: var(--hp-weight-semi);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .agenda__events { display: flex; flex-direction: column; gap: var(--hp-space-2); }
      .agenda__event { display: flex; align-items: center; gap: var(--hp-space-2); }
      .agenda__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hp-space-4);
        margin-top: var(--hp-space-4);
        font-size: var(--hp-text-sm);
        color: var(--hp-text-muted);
      }
      @media (max-width: 600px) {
        .agenda__day { grid-template-columns: 1fr; gap: var(--hp-space-2); }
      }
    `,
  ],
})
export class CalendarPageComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly calendarService = inject(CalendarService);

  readonly state = signal<CalState>('loading');
  readonly errorMessage = signal('');
  readonly groups = signal<DayGroup[]>([]);
  readonly monthLabel = signal('');

  private cursor = this.startOfMonth(new Date());

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
    this.monthLabel.set(
      new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric', calendar: 'gregory' }).format(this.cursor),
    );

    const from = this.cursor;
    const to = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + 1, 0, 23, 59, 59);

    this.calendarService.list(homeId, from.toISOString(), to.toISOString()).subscribe({
      next: (events) => {
        this.groups.set(this.groupByDay(events));
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  prevMonth(): void {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() - 1, 1);
    this.fetch();
  }

  nextMonth(): void {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + 1, 1);
    this.fetch();
  }

  thisMonth(): void {
    this.cursor = this.startOfMonth(new Date());
    this.fetch();
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private groupByDay(events: CalendarEvent[]): DayGroup[] {
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    const byDay = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.date));
      const list = byDay.get(key);
      if (list) list.push(event);
      else byDay.set(key, [event]);
    }

    const todayKey = dayKey(new Date());

    return [...byDay.entries()]
      .sort((a, b) => new Date(a[1][0].date).getTime() - new Date(b[1][0].date).getTime())
      .map(([key, dayEvents]) => ({
        dateLabel: formatArabicDate(dayEvents[0].date, false),
        isToday: key === todayKey,
        events: dayEvents.map((e) => ({
          title: e.title,
          icon: CALENDAR_EVENT_META[e.type].icon,
          color: CALENDAR_EVENT_META[e.type].color,
        })),
      }));
  }
}
