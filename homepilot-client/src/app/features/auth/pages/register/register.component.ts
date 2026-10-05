import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'hp-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth">
      <div class="auth__panel">
        <a class="brand" routerLink="/">
          <span class="brand__mark"><i></i></span>
          HomePilot
        </a>

        <h1>ابدأ مجانًا</h1>
        <p class="auth__lede">افتح ملف بيتك في أقل من دقيقتين.</p>

        <div class="hp-alert hp-alert--error" *ngIf="error()">{{ error() }}</div>

        <form class="hp-stack" (submit)="onSubmit($event)">
          <div class="hp-field">
            <label for="fullName">الاسم بالكامل</label>
            <input
              id="fullName"
              type="text"
              autocomplete="name"
              required
              minlength="2"
              [value]="fullName()"
              (input)="fullName.set($any($event.target).value)"
            />
          </div>

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
              autocomplete="new-password"
              required
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
            <span class="hp-hint">٨ أحرف على الأقل، فيها حرف كبير وحرف صغير ورقم.</span>
          </div>

          <button type="submit" class="hp-btn hp-btn--accent hp-btn--block hp-btn--lg" [disabled]="loading()">
            <span class="hp-spin" *ngIf="loading()"></span>
            {{ loading() ? 'بيتعمل الحساب...' : 'افتح ملف بيتك' }}
          </button>
        </form>

        <p class="auth__switch">عندك حساب بالفعل؟ <a routerLink="/auth/login">سجّل دخولك</a></p>
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

      .auth__switch { text-align: center; font-size: var(--hp-text-sm); color: var(--hp-text-muted); }
    `,
  ],
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly fullName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;

    const passwordError = this.validatePassword(this.password());
    if (passwordError) {
      this.error.set(passwordError);
      return;
    }

    this.error.set('');
    this.loading.set(true);

    this.auth
      .register({ fullName: this.fullName().trim(), email: this.email().trim(), password: this.password() })
      .subscribe({
        next: () => this.router.navigateByUrl('/app/home'),
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'مقدرناش نعمل الحساب — حاول تاني.'));
        },
      });
  }

  private validatePassword(password: string): string | null {
    if (password.length < 8) return 'كلمة المرور لازم تكون ٨ أحرف على الأقل.';
    if (!/[A-Z]/.test(password)) return 'كلمة المرور لازم تحتوي على حرف كبير (A-Z).';
    if (!/[a-z]/.test(password)) return 'كلمة المرور لازم تحتوي على حرف صغير (a-z).';
    if (!/[0-9]/.test(password)) return 'كلمة المرور لازم تحتوي على رقم.';
    return null;
  }
}
