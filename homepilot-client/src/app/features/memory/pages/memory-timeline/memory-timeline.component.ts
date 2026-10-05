import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HomeService } from '../../../../core/services/home.service';
import { HomeMemoryService } from '../../../../core/services/home-memory.service';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type MemoryState = 'loading' | 'no-home' | 'ready' | 'error';

interface TimelineRow {
  text: string;
  dateLabel: string;
  isNote: boolean;
}

@Component({
  selector: 'hp-memory-timeline',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <hp-page-header
      title="ذاكرة البيت"
      subtitle="كل حاجة حصلت في بيتك — الأجهزة اللي اتشرت، الصيانة اللي خلصت، والمصاريف — مرتّبة بالتاريخ."
    ></hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <hp-empty-state *ngIf="state() === 'no-home'" title="ضيف بيتك الأول" hint="محتاج تعمل بيت الأول من شاشة «بيوتي».">
    </hp-empty-state>

    <div class="hp-stack" *ngIf="state() === 'loading'">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3, 4, 5]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <hp-empty-state
        *ngIf="rows().length === 0"
        title="لسه مفيش ذكريات مسجّلة"
        hint="أول ما تضيف جهاز أو تخلّص مهمة صيانة أو تسجّل مصروف، هيبان هنا تلقائي."
      ></hp-empty-state>

      <div class="timeline" *ngIf="rows().length > 0">
        <div class="timeline__item" *ngFor="let row of rows()">
          <span class="timeline__dot" [class.timeline__dot--note]="row.isNote"></span>
          <div class="timeline__body">
            <p [class.timeline__note]="row.isNote">{{ row.text }}</p>
            <span class="hp-muted">{{ row.dateLabel }}</span>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [
    `
      .timeline { position: relative; padding-inline-start: 4px; }
      .timeline__item { position: relative; padding-inline-start: 26px; padding-bottom: var(--hp-space-5); }
      .timeline__item:last-child { padding-bottom: 0; }
      .timeline__item::before {
        content: '';
        position: absolute;
        inset-inline-start: 5px;
        top: 16px;
        bottom: -4px;
        width: 1px;
        background: var(--hp-border);
      }
      .timeline__item:last-child::before { display: none; }
      .timeline__dot {
        position: absolute;
        inset-inline-start: 0;
        top: 3px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: var(--hp-navy-600);
        border: 2px solid var(--hp-surface);
        box-shadow: 0 0 0 1px var(--hp-border);
      }
      .timeline__dot--note { background: var(--hp-due); }
      .timeline__body p { margin-bottom: 2px; }
      .timeline__note { color: var(--hp-due-text); font-weight: var(--hp-weight-medium); }
    `,
  ],
})
export class MemoryTimelineComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly memoryService = inject(HomeMemoryService);

  readonly state = signal<MemoryState>('loading');
  readonly errorMessage = signal('');
  readonly rows = signal<TimelineRow[]>([]);

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
    this.memoryService.list(homeId).subscribe({
      next: (entries) => {
        this.rows.set(
          entries.map((e) => ({
            text: e.text,
            dateLabel: formatArabicDate(e.date, true),
            // السيرفر بيضيف ملاحظات "نمط متكرر" (مش حدث فعلي) بتاريخ النهاردة — نبرزها بشكل مختلف شوية.
            isNote: e.text.startsWith('ملاحظة:'),
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
}
