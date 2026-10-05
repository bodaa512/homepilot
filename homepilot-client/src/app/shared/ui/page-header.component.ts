import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * رأس الصفحة — نفس الشكل في كل شاشة.
 *
 *   <hp-page-header title="الأجهزة والأصول" subtitle="٢٤ جهاز">
 *     <button class="hp-btn hp-btn--primary hp-btn--sm">أضف جهاز</button>
 *   </hp-page-header>
 */
@Component({
  selector: 'hp-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="head">
      <div class="head__text">
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="head__actions"><ng-content /></div>
    </div>
  `,
  styles: [
    `
      :host { display: block; margin-bottom: var(--hp-space-5); }
      .head { display: flex; align-items: flex-start; gap: var(--hp-space-4); flex-wrap: wrap; }
      .head__text h1 { font-size: var(--hp-text-xl); }
      .head__text p { margin: 2px 0 0; font-size: var(--hp-text-xs); color: var(--hp-text-muted); }
      .head__actions {
        display: flex;
        align-items: center;
        gap: var(--hp-space-2);
        margin-inline-start: auto;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
