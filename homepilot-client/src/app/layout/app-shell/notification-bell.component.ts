import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/models/notification.model';
import { formatArabicDate } from '../../core/utils/formatters';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
  isRead: boolean;
  actionUrl: string;
  priority: AppNotification['priority'];
}

/**
 * جرس الإشعارات في الشريط العلوي: عدّاد غير المقروء + قائمة منسدلة.
 * الضغط على إشعار بيعلّمه مقروء ويفتح رابطه (لو موجود).
 */
@Component({
  selector: 'hp-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bell">
      <button
        type="button"
        class="bell__btn"
        (click)="toggle()"
        aria-label="الإشعارات"
        [attr.aria-expanded]="open()"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0" />
        </svg>
        <span class="bell__count" *ngIf="notificationService.unreadCount() > 0">
          {{ notificationService.unreadCount() > 9 ? '9+' : notificationService.unreadCount() }}
        </span>
      </button>

      <div class="bell__panel" *ngIf="open()" role="dialog" aria-label="الإشعارات">
        <div class="bell__head">
          <strong>الإشعارات</strong>
          <button
            type="button"
            class="hp-btn hp-btn--ghost hp-btn--sm"
            *ngIf="notificationService.unreadCount() > 0"
            (click)="markAll()"
          >
            علّم الكل كمقروء
          </button>
        </div>

        <div class="bell__state" *ngIf="loading()">بيتم التحميل...</div>
        <div class="bell__state" *ngIf="error()">{{ error() }}</div>
        <div class="bell__state" *ngIf="!loading() && !error() && rows().length === 0">مفيش إشعارات لسه.</div>

        <ul class="bell__list" *ngIf="!loading() && rows().length > 0">
          <li *ngFor="let n of rows()">
            <button type="button" class="bell__item" [class.bell__item--unread]="!n.isRead" (click)="openItem(n)">
              <span class="bell__dot" *ngIf="!n.isRead"></span>
              <span class="bell__text">
                <strong>{{ n.title }}</strong>
                <span *ngIf="n.body">{{ n.body }}</span>
                <small>{{ n.dateLabel }}</small>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; position: relative; }
      .bell { position: relative; }
      .bell__btn {
        position: relative;
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-sm);
        color: var(--hp-text-muted);
        cursor: pointer;
      }
      .bell__btn:hover { color: var(--hp-text); border-color: var(--hp-border-strong); }
      .bell__count {
        position: absolute;
        top: -6px;
        inset-inline-end: -6px;
        min-width: 17px;
        height: 17px;
        padding: 0 4px;
        border-radius: 9px;
        background: var(--hp-late);
        color: #fff;
        font-size: 10px;
        font-weight: var(--hp-weight-semi);
        display: grid;
        place-items: center;
      }
      .bell__panel {
        position: absolute;
        top: calc(100% + 8px);
        inset-inline-end: 0;
        width: 340px;
        max-width: 90vw;
        max-height: 420px;
        display: flex;
        flex-direction: column;
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        box-shadow: var(--hp-shadow-pop);
        z-index: var(--hp-z-drawer);
      }
      .bell__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--hp-space-2);
        padding: var(--hp-space-3) var(--hp-space-4);
        border-bottom: 1px solid var(--hp-border);
      }
      .bell__state { padding: var(--hp-space-5); text-align: center; color: var(--hp-text-muted); font-size: var(--hp-text-sm); }
      .bell__list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
      .bell__item {
        width: 100%;
        display: flex;
        gap: var(--hp-space-2);
        align-items: flex-start;
        padding: var(--hp-space-3) var(--hp-space-4);
        text-align: start;
        background: transparent;
        border: 0;
        border-bottom: 1px solid var(--hp-border);
        cursor: pointer;
        color: var(--hp-text);
      }
      .bell__item:hover { background: var(--hp-surface-sunken); }
      .bell__item--unread { background: color-mix(in srgb, var(--hp-info) 7%, transparent); }
      .bell__dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--hp-info); flex: none; }
      .bell__text { display: flex; flex-direction: column; gap: 2px; font-size: var(--hp-text-sm); }
      .bell__text small { color: var(--hp-text-muted); }
    `,
  ],
})
export class NotificationBellComponent implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly rows = signal<NotificationRow[]>([]);

  ngOnInit(): void {
    // تحميل أولي بس عشان العدّاد يظهر — القايمة نفسها بتتحمّل لما تتفتح.
    this.notificationService.list().subscribe({ error: () => undefined });
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.load();
  }

  markAll(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => this.rows.update((list) => list.map((r) => ({ ...r, isRead: true }))),
      error: () => this.error.set('مقدرناش نعلّم الإشعارات كمقروءة — حاول تاني.'),
    });
  }

  openItem(row: NotificationRow): void {
    if (!row.isRead) {
      this.notificationService.markRead(row.id).subscribe({
        next: () => this.rows.update((list) => list.map((r) => (r.id === row.id ? { ...r, isRead: true } : r))),
        error: () => undefined,
      });
    }
    if (row.actionUrl && row.actionUrl.startsWith('/')) {
      this.open.set(false);
      this.router.navigateByUrl(row.actionUrl);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.notificationService.list().subscribe({
      next: (items) => {
        this.rows.set(
          items.map((n) => ({
            id: n._id,
            title: n.title,
            body: n.body ?? '',
            dateLabel: formatArabicDate(n.createdAt, false),
            isRead: n.isRead,
            actionUrl: n.actionUrl ?? '',
            priority: n.priority,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('مقدرناش نجيب الإشعارات — حاول تاني.');
      },
    });
  }
}
