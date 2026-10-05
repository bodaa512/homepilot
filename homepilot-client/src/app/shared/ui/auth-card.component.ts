import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * كارت شاشات الدخول (نسيت كلمة المرور، إعادة التعيين، تفعيل الإيميل) — نفس
 * شكل شاشة الدخول: شعار، عنوان، سطر توضيحي، والمحتوى جوّه.
 *
 *   <hp-auth-card title="نسيت كلمة المرور؟" lede="اكتب إيميلك وهنبعتلك رابط.">...</hp-auth-card>
 */
@Component({
  selector: 'hp-auth-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth">
      <div class="auth__panel">
        <a class="brand" routerLink="/">
          <span class="brand__mark"><i></i></span>
          HomePilot
        </a>
        <h1>{{ title }}</h1>
        @if (lede) {
          <p class="auth__lede">{{ lede }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; min-height: 100dvh; background: var(--hp-bg); }
      .auth {
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: var(--hp-space-5);
      }
      .auth__panel {
        width: 100%;
        max-width: 380px;
        padding: var(--hp-space-6);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-lg);
        box-shadow: var(--hp-shadow-md);
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-bottom: var(--hp-space-5);
        font-weight: var(--hp-weight-semi);
        color: var(--hp-text);
        text-decoration: none;
      }
      .brand__mark {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: var(--hp-navy-700);
        display: grid;
        place-items: center;
        flex: none;
      }
      .brand__mark i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hp-ok);
        box-shadow: 0 0 0 3px rgba(28, 138, 107, 0.3);
      }
      h1 { font-size: var(--hp-text-xl); margin-bottom: 4px; }
      .auth__lede { color: var(--hp-text-muted); font-size: var(--hp-text-sm); margin-bottom: var(--hp-space-5); }
    `,
  ],
})
export class AuthCardComponent {
  @Input({ required: true }) title = '';
  @Input() lede = '';
}
