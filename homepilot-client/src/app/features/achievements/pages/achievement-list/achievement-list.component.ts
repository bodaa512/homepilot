import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { AchievementService } from '../../../../core/services/achievement.service';
import { ACHIEVEMENT_CODES, ACHIEVEMENT_INFO, AchievementCode } from '../../../../core/models/achievement.model';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type AchievementsState = 'loading' | 'ready' | 'error';

interface BadgeView {
  code: AchievementCode;
  label: string;
  hint: string;
  unlocked: boolean;
  unlockedLabel: string;
}

@Component({
  selector: 'hp-achievement-list',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <hp-page-header title="الإنجازات" [subtitle]="subtitle()"></hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <div class="badges" *ngIf="state() === 'loading'">
      <div class="hp-skeleton" style="height: 120px" *ngFor="let i of [1, 2, 3, 4, 5, 6]"></div>
    </div>

    <div class="badges" *ngIf="state() === 'ready'">
      <div class="badge-card" *ngFor="let b of badges()" [class.badge-card--locked]="!b.unlocked">
        <div class="badge-card__icon">{{ b.unlocked ? '🏆' : '🔒' }}</div>
        <strong>{{ b.label }}</strong>
        <p class="hp-muted">{{ b.hint }}</p>
        <span class="hp-badge" [class.hp-badge--ok]="b.unlocked" [class.hp-badge--neutral]="!b.unlocked">
          {{ b.unlocked ? b.unlockedLabel : 'لسه م اتفتحش' }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--hp-space-4); }
      .badge-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: var(--hp-space-5) var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .badge-card--locked { opacity: 0.55; }
      .badge-card__icon { font-size: 32px; margin-bottom: 4px; }
    `,
  ],
})
export class AchievementListComponent implements OnInit {
  private readonly achievementService = inject(AchievementService);

  readonly state = signal<AchievementsState>('loading');
  readonly errorMessage = signal('');
  readonly badges = signal<BadgeView[]>([]);

  subtitle(): string {
    if (this.state() !== 'ready') return '';
    const unlocked = this.badges().filter((b) => b.unlocked).length;
    return `فتحت ${unlocked} من ${this.badges().length}`;
  }

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.state.set('loading');
    this.achievementService.list().subscribe({
      next: (achievements) => {
        const unlockedByCode = new Map(achievements.map((a) => [a.code, a.unlockedAt]));
        this.badges.set(
          ACHIEVEMENT_CODES.map((code) => {
            const unlockedAt = unlockedByCode.get(code);
            const info = ACHIEVEMENT_INFO[code];
            return {
              code,
              label: info.label,
              hint: info.hint,
              unlocked: !!unlockedAt,
              unlockedLabel: unlockedAt ? `اتفتح ${formatArabicDate(unlockedAt, false)}` : '',
            };
          }),
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
