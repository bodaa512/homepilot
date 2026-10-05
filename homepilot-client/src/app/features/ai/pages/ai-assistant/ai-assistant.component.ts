import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { AiService } from '../../../../core/services/ai.service';
import { HomeService } from '../../../../core/services/home.service';
import {
  RepairVsReplaceInput,
  RepairVsReplaceRecommendation,
  RepairVsReplaceResult,
} from '../../../../core/models/ai.model';
import { formatArabicNumber } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type AiState = 'loading' | 'no-home' | 'ready' | 'error';
type Tab = 'chat' | 'calc';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const RECOMMENDATION_VIEW: Record<RepairVsReplaceRecommendation, { status: HpStatus; label: string }> = {
  REPAIR: { status: 'ok', label: 'أصلّحه' },
  CONSIDER_REPLACEMENT: { status: 'due', label: 'فكّر في الاستبدال' },
  REPLACE: { status: 'late', label: 'استبدله' },
};

/**
 * المساعد الذكي: محادثة عن البيت الشغّال (السيرفر بيبني السياق من بيانات
 * البيت)، + حاسبة "أصلّح ولا أستبدل؟" اللي هي حساب ثابت من غير AI.
 * لو الباقة مش بتدعم المساعد أو مفتاح الـ AI مش متظبط، رسالة السيرفر
 * بتظهر زي ما هي.
 */
@Component({
  selector: 'hp-ai-assistant',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <hp-page-header title="المساعد الذكي" subtitle="اسأل عن بيتك، أو احسب الأنسب: تصلّح ولا تستبدل."></hp-page-header>

    <div class="tabs">
      <button type="button" class="hp-chip" [class.hp-chip--on]="tab() === 'chat'" (click)="tab.set('chat')">محادثة</button>
      <button type="button" class="hp-chip" [class.hp-chip--on]="tab() === 'calc'" (click)="tab.set('calc')">
        أصلّح ولا أستبدل؟
      </button>
    </div>

    <!-- ------------------------------- المحادثة ------------------------------- -->
    <ng-container *ngIf="tab() === 'chat'">
      <hp-empty-state *ngIf="state() === 'no-home'" title="ضيف بيتك الأول" hint="المساعد بيشتغل على بيانات بيتك — اعمل بيت من شاشة «بيوتي».">
      </hp-empty-state>

      <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
        {{ errorMessage() }}
        <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="loadHistory()">حاول تاني</button>
      </div>

      <div class="hp-stack" *ngIf="state() === 'loading'">
        <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3]"></div>
      </div>

      <div class="chat" *ngIf="state() === 'ready'">
        <div class="chat__log" #log>
          <p class="hp-muted chat__hint" *ngIf="bubbles().length === 0">
            جرّب: «إيه المهام المتأخرة عندي؟» أو «مصاريف الشهر ده كانت كام؟»
          </p>
          <div class="bubble" *ngFor="let b of bubbles()" [class.bubble--me]="b.role === 'user'">
            {{ b.text }}
          </div>
          <div class="bubble bubble--typing" *ngIf="sending()">بيكتب...</div>
        </div>

        <div class="hp-alert hp-alert--error" *ngIf="sendError()">{{ sendError() }}</div>

        <form class="chat__form" (submit)="send($event)">
          <textarea
            rows="2"
            placeholder="اكتب سؤالك..."
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            (keydown.enter)="onEnter($event)"
            [disabled]="sending()"
          ></textarea>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="sending() || !draft().trim()">إرسال</button>
        </form>
      </div>
    </ng-container>

    <!-- ------------------------------- الحاسبة ------------------------------- -->
    <ng-container *ngIf="tab() === 'calc'">
      <form class="hp-form-grid calc" (submit)="calculate($event)">
        <div class="hp-field" *ngFor="let f of calcFields">
          <label [for]="'calc-' + f.key">{{ f.label }}</label>
          <input
            [id]="'calc-' + f.key"
            type="number"
            min="0"
            step="any"
            required
            [value]="calc[f.key]()"
            (input)="calc[f.key].set($any($event.target).value)"
          />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="calcLoading()">
            <span class="hp-spin" *ngIf="calcLoading()"></span>
            احسب
          </button>
        </div>
      </form>

      <div class="hp-alert hp-alert--error" *ngIf="calcError()">{{ calcError() }}</div>

      <div class="calc-result" *ngIf="result() as r">
        <hp-status-badge [status]="recommendationView(r).status" [label]="recommendationView(r).label"></hp-status-badge>
        <p>{{ r.explanation }}</p>
        <p class="hp-muted">
          إجمالي مصروفات الإصلاح: {{ format(r.totalRepairInvestment) }} — نسبتها من تكلفة الاستبدال:
          {{ format(r.repairToReplacementRatio * 100) }}٪
        </p>
      </div>
    </ng-container>
  `,
  styles: [
    `
      .tabs { display: flex; gap: var(--hp-space-2); margin-bottom: var(--hp-space-4); }
      .chat { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .chat__log {
        display: flex;
        flex-direction: column;
        gap: var(--hp-space-2);
        min-height: 280px;
        max-height: 55vh;
        overflow-y: auto;
        padding: var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .chat__hint { margin: auto; text-align: center; }
      .bubble {
        max-width: 80%;
        align-self: flex-start;
        padding: var(--hp-space-2) var(--hp-space-3);
        background: var(--hp-surface-sunken);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        white-space: pre-wrap;
        line-height: 1.7;
      }
      .bubble--me { align-self: flex-end; background: var(--hp-navy-700); border-color: var(--hp-navy-700); color: #fff; }
      .bubble--typing { color: var(--hp-text-muted); font-style: italic; }
      .chat__form { display: flex; gap: var(--hp-space-2); align-items: flex-end; }
      .chat__form textarea { flex: 1; resize: vertical; }
      .calc { max-width: 560px; margin-bottom: var(--hp-space-4); }
      .calc-result {
        max-width: 560px;
        display: flex;
        flex-direction: column;
        gap: var(--hp-space-2);
        padding: var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
    `,
  ],
})
export class AiAssistantComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly homeService = inject(HomeService);

  @ViewChild('log') private logEl?: ElementRef<HTMLElement>;

  readonly tab = signal<Tab>('chat');

  // ---- المحادثة
  readonly state = signal<AiState>('loading');
  readonly errorMessage = signal('');
  readonly bubbles = signal<ChatBubble[]>([]);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly sendError = signal('');

  // ---- الحاسبة
  readonly calcFields: { key: keyof RepairVsReplaceInput; label: string }[] = [
    { key: 'originalPrice', label: 'سعر الجهاز وقت الشراء' },
    { key: 'currentAgeYears', label: 'عمره الحالي (سنين)' },
    { key: 'expectedLifespanYears', label: 'عمره المتوقع (سنين)' },
    { key: 'repairCost', label: 'تكلفة الإصلاح دلوقتي' },
    { key: 'previousRepairsCost', label: 'إجمالي إصلاحات سابقة' },
    { key: 'replacementCost', label: 'تكلفة شراء بديل جديد' },
  ];
  readonly calc = {
    originalPrice: signal(''),
    currentAgeYears: signal(''),
    expectedLifespanYears: signal(''),
    repairCost: signal(''),
    previousRepairsCost: signal(''),
    replacementCost: signal(''),
  };
  readonly calcLoading = signal(false);
  readonly calcError = signal('');
  readonly result = signal<RepairVsReplaceResult | null>(null);

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => this.loadHistory(),
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  loadHistory(): void {
    const homeId = this.homeService.activeHomeId();
    if (!homeId) {
      this.state.set('no-home');
      return;
    }
    this.state.set('loading');
    this.ai.history(homeId).subscribe({
      next: (messages) => {
        this.bubbles.set(messages.map((m) => ({ id: m._id, role: m.role, text: m.content })));
        this.state.set('ready');
        this.scrollToEnd();
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return; // Shift+Enter = سطر جديد
    this.send(event);
  }

  send(event: Event): void {
    event.preventDefault();
    const homeId = this.homeService.activeHomeId();
    const text = this.draft().trim();
    if (!homeId || !text || this.sending()) return;

    this.sendError.set('');
    this.sending.set(true);
    this.bubbles.update((list) => [...list, { id: `local-${Date.now()}`, role: 'user', text }]);
    this.draft.set('');
    this.scrollToEnd();

    this.ai.chat(homeId, text).subscribe({
      next: (reply) => {
        this.sending.set(false);
        this.bubbles.update((list) => [...list, { id: reply._id, role: 'assistant', text: reply.content }]);
        this.scrollToEnd();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.sendError.set(apiErrorMessage(err, 'المساعد مردّش — حاول تاني.'));
      },
    });
  }

  calculate(event: Event): void {
    event.preventDefault();
    if (this.calcLoading()) return;

    const input = {} as RepairVsReplaceInput;
    for (const f of this.calcFields) {
      const value = Number(this.calc[f.key]());
      if (!Number.isFinite(value) || value < 0) {
        this.calcError.set('املأ كل الخانات بأرقام صحيحة (صفر أو أكتر).');
        return;
      }
      input[f.key] = value;
    }
    if (input.expectedLifespanYears <= 0) {
      this.calcError.set('العمر المتوقع لازم يبقى أكبر من صفر.');
      return;
    }

    this.calcError.set('');
    this.calcLoading.set(true);
    this.ai.repairVsReplace(input).subscribe({
      next: (r) => {
        this.calcLoading.set(false);
        this.result.set(r);
      },
      error: (err: unknown) => {
        this.calcLoading.set(false);
        this.calcError.set(apiErrorMessage(err));
      },
    });
  }

  recommendationView(r: RepairVsReplaceResult): { status: HpStatus; label: string } {
    return RECOMMENDATION_VIEW[r.recommendation];
  }

  format(value: number): string {
    return formatArabicNumber(Math.round(value));
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.logEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
