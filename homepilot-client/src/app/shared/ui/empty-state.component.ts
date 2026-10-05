import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * الشاشة الفاضية دعوة للفعل مش اعتذار — العنوان بيقول إيه اللي ناقص،
 * والسطر اللي تحته بيقول أول خطوة.
 *
 *   <hp-empty-state title="لسه مفيش أجهزة" hint="ابدأ بالتكييف أو السخّان.">
 *     <button class="hp-btn hp-btn--primary">أضف أول جهاز</button>
 *   </hp-empty-state>
 */
@Component({
  selector: 'hp-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hp-empty">
      <h3>{{ title }}</h3>
      <p *ngIf="hint">{{ hint }}</p>
      <ng-content />
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() hint = '';
}
