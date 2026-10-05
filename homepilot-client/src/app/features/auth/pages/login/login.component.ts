import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

/**
 * شاشة دخول حقيقية — قبل كده روابط "دخول"/"ابدأ مجانًا" كانت بترجّع
 * على /app/home مباشرة من غير أي تحقق (شوف التعليق اللي كان في
 * app.routes.ts). دلوقتي بتنادي AuthService.login فعليًا.
 */
@Component({
  selector: 'hp-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth">
      <div class="auth__panel">
        <a class="brand" routerLink="/">
          <span class="brand__mark"><i></i></span>
          HomePilot
        </a>

        <h1>أهلًا بيك تاني</h1>
        <p class="auth__lede">سجّل دخولك عشان تكمّل متابعة بيتك.</p>

        <div class="hp-alert hp-alert--error" *ngIf="error()">{{ error() }}</div>

        <form class="hp-stack" (submit)="onSubmit($event)">
          <div class="hp-field">
            <label for="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              autocomplete="email"
              required
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </div>

          <div class="hp-field">
            <label for="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              autocomplete="current-password"
              required
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
            <a class="auth__forgot" routerLink="/auth/forgot-password">نسيت كلمة المرور؟</a>
          </div>

          <button type="submit" class="hp-btn hp-btn--primary hp-btn--block hp-btn--lg" [disabled]="loading()">
            <span class="hp-spin" *ngIf="loading()"></span>
            {{ loading() ? 'بيتم الدخول...' : 'دخول' }}
          </button>
        </form>

        <p class="auth__switch">مستخدم جديد؟ <a routerLink="/auth/register">اعمل حساب</a></p>
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

      form { margin-bottom: var(--hp-space-4); }
      .hp-alert { margin-bottom: var(--hp-space-4); }

      .auth__forgot { align-self: flex-start; font-size: var(--hp-text-xs); }
      .auth__switch { text-align: center; font-size: var(--hp-text-sm); color: var(--hp-text-muted); }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;

    this.error.set('');
    this.loading.set(true);

    this.auth.login({ email: this.email().trim(), password: this.password() }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || '/app/home');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'الإيميل أو الباسورد غلط.'));
      },
    });
  }
}
