import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * نافذة منبثقة عامة — أي فورم "إضافة" في التطبيق (جهاز، مصروف، مهمة،
 * بيت جديد...) بيستخدمها بدل ما كل شاشة تعمل نافذتها الخاصة، عشان
 * الشكل والسلوك (إغلاق بـ Escape، إغلاق بالنقر على الخلفية) يفضل
 * موحّد في كل مكان.
 *
 *   <hp-modal title="أضف جهاز" (closed)="showForm.set(false)">
 *     <form ...>...</form>
 *   </hp-modal>
 */
@Component({
  selector: 'hp-modal',
  standalone: true,
  template: `
    <div class="hp-modal-scrim" (click)="requestClose()">
      <div
        class="hp-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
        (click)="$event.stopPropagation()"
      >
        <div class="hp-modal__head">
          <h2>{{ title }}</h2>
          <button type="button" class="hp-modal__close" (click)="requestClose()" aria-label="إغلاق">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div class="hp-modal__body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: contents; }'],
})
export class ModalComponent {
  @Input({ required: true }) title = '';
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.requestClose();
  }

  requestClose(): void {
    this.closed.emit();
  }
}
