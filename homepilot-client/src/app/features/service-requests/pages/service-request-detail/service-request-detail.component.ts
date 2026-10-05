import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { ServiceRequestService } from '../../../../core/services/service-request.service';
import {
  ChatMessage,
  REQUEST_STATUS_LABELS,
  SERVICE_CATEGORY_LABELS,
  ServiceOffer,
  ServiceRequest,
  ServiceRequestStatus,
  URGENCY_LABELS,
} from '../../../../core/models/service-request.model';
import { formatArabicDate, formatCurrency } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type DetailState = 'loading' | 'ready' | 'error';

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

interface OfferRow {
  id: string;
  providerId: string;
  providerName: string;
  ratingLabel: string;
  verified: boolean;
  priceLabel: string;
  durationLabel: string;
  proposedDateLabel: string;
  message: string;
  accepted: boolean;
  rejected: boolean;
}

interface ChatBubble {
  id: string;
  mine: boolean;
  text: string;
}

@Component({
  selector: 'hp-service-request-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <a routerLink="/app/service-requests" class="hp-btn hp-btn--ghost hp-btn--sm back-link">‹ كل الطلبات</a>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <div class="hp-stack" *ngIf="state() === 'loading'">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready' && request() as r">
      <hp-page-header [title]="r.title" [subtitle]="subtitle(r)">
        <span class="hp-cluster">
          <hp-status-badge [status]="STATUS_BADGE[r.status]" [label]="REQUEST_STATUS_LABELS[r.status]"></hp-status-badge>
          <button
            type="button"
            class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger"
            *ngIf="r.status !== 'CANCELLED' && r.status !== 'REVIEWED'"
            [disabled]="cancelling()"
            (click)="cancel()"
          >
            ألغِ الطلب
          </button>
        </span>
      </hp-page-header>

      <p *ngIf="r.description" class="hp-muted description">{{ r.description }}</p>
      <div class="hp-alert hp-alert--error" *ngIf="actionError()">{{ actionError() }}</div>

      <h2 class="section-title">العروض</h2>
      <p class="hp-muted" *ngIf="offers().length === 0">لسه مفيش عروض على الطلب ده.</p>

      <div class="offers" *ngIf="offers().length > 0">
        <div class="offer" *ngFor="let o of offers()" [class.offer--accepted]="o.accepted" [class.offer--rejected]="o.rejected">
          <div class="offer__head">
            <div>
              <strong>{{ o.providerName }}</strong>
              <span class="hp-badge hp-badge--ok" *ngIf="o.verified" style="margin-inline-start:6px">موثّق</span>
            </div>
            <span class="hp-muted">{{ o.ratingLabel }}</span>
          </div>
          <div class="offer__price">{{ o.priceLabel }}</div>
          <p class="hp-muted" *ngIf="o.durationLabel">المدة المتوقعة: {{ o.durationLabel }}</p>
          <p class="hp-muted" *ngIf="o.proposedDateLabel">الميعاد المقترح: {{ o.proposedDateLabel }}</p>
          <p *ngIf="o.message">{{ o.message }}</p>

          <div class="offer__actions">
            <button
              type="button"
              class="hp-btn hp-btn--primary hp-btn--sm"
              *ngIf="!o.accepted && !o.rejected"
              [disabled]="accepting() !== null"
              (click)="accept(o)"
            >
              <span class="hp-spin" *ngIf="accepting() === o.id"></span> اقبل العرض ده
            </button>
            <span class="hp-badge hp-badge--ok" *ngIf="o.accepted">مقبول</span>
            <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="toggleChat(o)">
              {{ chatTarget() === o.providerId ? 'اقفل المحادثة' : 'راسل مزوّد الخدمة' }}
            </button>
          </div>

          <div class="chat" *ngIf="chatTarget() === o.providerId">
            <div class="chat__log">
              <p class="hp-muted" *ngIf="chatLoading()">بيتم التحميل...</p>
              <p class="hp-muted" *ngIf="!chatLoading() && bubbles().length === 0">ابدأ المحادثة.</p>
              <div class="bubble" *ngFor="let b of bubbles()" [class.bubble--me]="b.mine">{{ b.text }}</div>
            </div>
            <div class="hp-alert hp-alert--error" *ngIf="chatError()">{{ chatError() }}</div>
            <form class="chat__form" (submit)="sendMessage($event, o)">
              <input
                type="text"
                placeholder="اكتب رسالة..."
                [value]="chatDraft()"
                (input)="chatDraft.set($any($event.target).value)"
              />
              <button type="submit" class="hp-btn hp-btn--primary hp-btn--sm" [disabled]="sendingChat() || !chatDraft().trim()">
                ابعت
              </button>
            </form>
          </div>
        </div>
      </div>

      <ng-container *ngIf="r.status === 'COMPLETED'">
        <h2 class="section-title">قيّم الخدمة</h2>
        <div class="hp-alert hp-alert--error" *ngIf="reviewError()">{{ reviewError() }}</div>
        <div class="hp-alert hp-alert--info" *ngIf="reviewDone()">شكرًا على تقييمك!</div>
        <form class="review" (submit)="submitReview($event)" *ngIf="!reviewDone()">
          <div class="stars">
            <button
              type="button"
              *ngFor="let n of [1, 2, 3, 4, 5]"
              [class.star--on]="n <= rating()"
              class="star"
              (click)="rating.set(n)"
            >
              ★
            </button>
          </div>
          <textarea
            rows="3"
            placeholder="اكتب تعليق (اختياري)"
            [value]="reviewComment()"
            (input)="reviewComment.set($any($event.target).value)"
          ></textarea>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="submittingReview()">
            <span class="hp-spin" *ngIf="submittingReview()"></span> ابعت التقييم
          </button>
        </form>
      </ng-container>
    </ng-container>
  `,
  styles: [
    `
      .back-link { display: inline-flex; margin-bottom: var(--hp-space-3); }
      .description { margin: var(--hp-space-2) 0 var(--hp-space-4); }
      .section-title { font-size: var(--hp-text-lg); margin: var(--hp-space-5) 0 var(--hp-space-3); }
      .offers { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .offer {
        padding: var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .offer--accepted { border-color: var(--hp-ok); box-shadow: 0 0 0 1px var(--hp-ok) inset; }
      .offer--rejected { opacity: 0.5; }
      .offer__head { display: flex; align-items: center; justify-content: space-between; gap: var(--hp-space-2); }
      .offer__price { font-size: var(--hp-text-lg); font-weight: var(--hp-weight-semi); margin: 4px 0; }
      .offer__actions { display: flex; align-items: center; gap: var(--hp-space-2); margin-top: var(--hp-space-2); }
      .chat {
        margin-top: var(--hp-space-3);
        padding-top: var(--hp-space-3);
        border-top: 1px solid var(--hp-border);
      }
      .chat__log { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; margin-bottom: var(--hp-space-2); }
      .bubble {
        align-self: flex-start;
        max-width: 80%;
        padding: 6px 10px;
        background: var(--hp-surface-sunken);
        border-radius: var(--hp-radius-sm);
        font-size: var(--hp-text-sm);
      }
      .bubble--me { align-self: flex-end; background: var(--hp-navy-700); color: #fff; }
      .chat__form { display: flex; gap: var(--hp-space-2); }
      .chat__form input { flex: 1; }
      .review { display: flex; flex-direction: column; gap: var(--hp-space-3); max-width: 480px; }
      .stars { display: flex; gap: 4px; }
      .star { font-size: 26px; line-height: 1; background: none; border: 0; color: var(--hp-border-strong); cursor: pointer; }
      .star--on { color: var(--hp-due); }
    `,
  ],
})
export class ServiceRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly requestService = inject(ServiceRequestService);

  readonly STATUS_BADGE = STATUS_BADGE;
  readonly REQUEST_STATUS_LABELS = REQUEST_STATUS_LABELS;

  readonly state = signal<DetailState>('loading');
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly request = signal<ServiceRequest | null>(null);
  readonly offers = signal<OfferRow[]>([]);

  readonly cancelling = signal(false);
  readonly accepting = signal<string | null>(null);

  readonly chatTarget = signal<string | null>(null);
  readonly chatLoading = signal(false);
  readonly chatError = signal('');
  readonly bubbles = signal<ChatBubble[]>([]);
  readonly chatDraft = signal('');
  readonly sendingChat = signal(false);
  private currentUserId = '';

  readonly rating = signal(5);
  readonly reviewComment = signal('');
  readonly submittingReview = signal(false);
  readonly reviewError = signal('');
  readonly reviewDone = signal(false);

  private requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch();
  }

  subtitle(r: ServiceRequest): string {
    return `${SERVICE_CATEGORY_LABELS[r.category] ?? r.category} · ${URGENCY_LABELS[r.urgency] ?? r.urgency} · ${formatArabicDate(r.createdAt, true)}`;
  }

  fetch(): void {
    if (!this.requestId) {
      this.state.set('error');
      this.errorMessage.set('الطلب غير موجود.');
      return;
    }
    this.state.set('loading');
    this.requestService.getOne(this.requestId).subscribe({
      next: (request) => {
        this.request.set(request);
        this.loadOffers();
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  private loadOffers(): void {
    this.requestService.listOffers(this.requestId).subscribe({
      next: (offers: ServiceOffer[]) => {
        this.offers.set(
          offers.map((o) => ({
            id: o._id,
            providerId: o.provider._id,
            providerName: o.provider.businessName,
            ratingLabel:
              o.provider.ratingCount > 0
                ? `⭐ ${o.provider.ratingAverage.toFixed(1)} (${o.provider.ratingCount})`
                : 'لسه مفيش تقييمات',
            verified: o.provider.verificationStatus === 'VERIFIED',
            priceLabel: formatCurrency(o.price, o.currency),
            durationLabel: o.estimatedDurationHours ? `${o.estimatedDurationHours} ساعة` : '',
            proposedDateLabel: o.proposedDate ? formatArabicDate(o.proposedDate, false) : '',
            message: o.message ?? '',
            accepted: o.status === 'accepted',
            rejected: o.status === 'rejected' || o.status === 'withdrawn',
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

  cancel(): void {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.actionError.set('');
    this.requestService.cancel(this.requestId).subscribe({
      next: (request) => {
        this.cancelling.set(false);
        this.request.set(request);
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نلغي الطلب — حاول تاني.'));
      },
    });
  }

  accept(offer: OfferRow): void {
    if (this.accepting()) return;
    this.accepting.set(offer.id);
    this.actionError.set('');
    this.requestService.acceptOffer(offer.id).subscribe({
      next: () => {
        this.accepting.set(null);
        this.fetch();
      },
      error: (err: unknown) => {
        this.accepting.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نقبل العرض — حاول تاني.'));
      },
    });
  }

  toggleChat(offer: OfferRow): void {
    if (this.chatTarget() === offer.providerId) {
      this.chatTarget.set(null);
      return;
    }
    this.chatTarget.set(offer.providerId);
    this.chatDraft.set('');
    this.chatError.set('');
    this.bubbles.set([]);
    this.chatLoading.set(true);
    this.requestService.listMessages(this.requestId, offer.providerId).subscribe({
      next: (messages: ChatMessage[]) => {
        // مفيش endpoint بيرجّع id المستخدم الحالي هنا؛ أول رسالة بنبعتها
        // إحنا هي اللي بتحدد مين "أنا" في الشات (شوف sendMessage تحت).
        this.bubbles.set(messages.map((m) => ({ id: m._id, mine: m.sender === this.currentUserId, text: m.text })));
        this.chatLoading.set(false);
      },
      error: (err: unknown) => {
        this.chatLoading.set(false);
        this.chatError.set(apiErrorMessage(err));
      },
    });
  }

  sendMessage(event: Event, offer: OfferRow): void {
    event.preventDefault();
    const text = this.chatDraft().trim();
    if (!text || this.sendingChat()) return;

    this.sendingChat.set(true);
    this.chatError.set('');
    this.requestService.sendMessage(this.requestId, offer.providerId, text).subscribe({
      next: (message) => {
        this.sendingChat.set(false);
        this.currentUserId = message.sender;
        this.chatDraft.set('');
        this.bubbles.update((list) => [...list, { id: message._id, mine: true, text: message.text }]);
      },
      error: (err: unknown) => {
        this.sendingChat.set(false);
        this.chatError.set(apiErrorMessage(err, 'مقدرناش نبعت الرسالة — حاول تاني.'));
      },
    });
  }

  submitReview(event: Event): void {
    event.preventDefault();
    if (this.submittingReview()) return;
    this.submittingReview.set(true);
    this.reviewError.set('');
    this.requestService
      .createReview(this.requestId, { ratingOverall: this.rating(), comment: this.reviewComment().trim() || undefined })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.reviewDone.set(true);
        },
        error: (err: unknown) => {
          this.submittingReview.set(false);
          this.reviewError.set(apiErrorMessage(err, 'مقدرناش نبعت التقييم — حاول تاني.'));
        },
      });
  }
}
