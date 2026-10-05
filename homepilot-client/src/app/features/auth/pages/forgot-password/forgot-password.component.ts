import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/ui/auth-card.component';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

/**
 * طلب رابط إعادة تعيين كلمة المرور. السيرفر بيرد بنفس الرد سواء الإيميل
 * ليه حساب أو لأ (عشان محدش يعرف مين مسجّل)، فالرسالة هنا عامة برضو.
 */
@Component({
  selector: 'hp-forgot-password',
  standalone: true,
  imports: [NgIf, RouterLink, AuthCardComponent],
  template: `
    <hp-auth-card
      title="نسيت كلمة المرور؟"
      [lede]="sent() ? '' : 'اكتب إيميلك وهنبعتلك رابط تختار بيه كلمة مرور جديدة.'"
    >
      @if (sent()) {
        <div class="hp-alert hp-alert--info">
          لو الإيميل ده مسجّل عندنا، هيوصلك رابط إعادة التعيين خلال دقايق. الرابط صالح لمدة ساعة.
        </div>
        <p class="switch"><a routerLink="/auth/login">الرجوع لتسجيل الدخول</a></p>
      } @else {
        @if (error()) {
          <div class="hp-alert hp-alert--error" style="margin-bottom: var(--hp-space-4)">{{ error() }}</div>
        }
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
          <button type="submit" class="hp-btn hp-btn--primary hp-btn--block hp-btn--lg" [disabled]="loading()">
            <span class="hp-spin" *ngIf="loading()"></span>
            {{ loading() ? 'بيتم الإرسال...' : 'ابعت الرابط' }}
          </button>
        </form>
        <p class="switch"><a routerLink="/auth/login">افتكرتها؟ ارجع للدخول</a></p>
      }
    </hp-auth-card>
  `,
  styles: [`.switch { text-align: center; font-size: var(--hp-text-sm); margin-top: var(--hp-space-4); }`],
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;
    const email = this.email().trim();
    if (!email) return;

    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'مقدرناش نبعت الرابط — حاول تاني.'));
      },
    });
  }
}
