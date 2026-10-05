import { NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/ui/auth-card.component';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

/**
 * الرابط اللي السيرفر بيبعته في الإيميل: /reset-password?token=...
 * نفس شروط كلمة المرور في السيرفر (٨ حروف + كبير + صغير + رقم) بنتحقق منها
 * هنا قبل الإرسال عشان المستخدم يشوف المشكلة فورًا.
 */
@Component({
  selector: 'hp-reset-password',
  standalone: true,
  imports: [NgIf, RouterLink, AuthCardComponent],
  template: `
    <hp-auth-card title="كلمة مرور جديدة" [lede]="!token || done() ? '' : 'اختار كلمة مرور جديدة لحسابك.'">
      <ng-container *ngIf="!token">
        <div class="hp-alert hp-alert--error">الرابط ناقص أو مش صحيح. اطلب رابط جديد وجرّب تاني.</div>
        <p class="switch"><a routerLink="/auth/forgot-password">اطلب رابط جديد</a></p>
      </ng-container>

      <ng-container *ngIf="token && done()">
        <div class="hp-alert hp-alert--info">اتغيّرت كلمة المرور. تقدر تسجّل دخولك بيها دلوقتي.</div>
        <a class="hp-btn hp-btn--primary hp-btn--block hp-btn--lg" routerLink="/auth/login" style="margin-top: var(--hp-space-4)">
          سجّل الدخول
        </a>
      </ng-container>

      <ng-container *ngIf="token && !done()">
        <div class="hp-alert hp-alert--error" *ngIf="error()" style="margin-bottom: var(--hp-space-4)">
          {{ error() }}
          <a routerLink="/auth/forgot-password" *ngIf="linkExpired()">اطلب رابط جديد</a>
        </div>
        <form class="hp-stack" (submit)="onSubmit($event)">
          <div class="hp-field">
            <label for="newPassword">كلمة المرور الجديدة</label>
            <input
              id="newPassword"
              type="password"
              autocomplete="new-password"
              required
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
            <span class="hp-hint">٨ حروف على الأقل، فيها حرف كبير وحرف صغير ورقم.</span>
          </div>
          <div class="hp-field">
            <label for="confirmPassword">تأكيد كلمة المرور</label>
            <input
              id="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              [value]="confirm()"
              (input)="confirm.set($any($event.target).value)"
            />
          </div>
          <button type="submit" class="hp-btn hp-btn--primary hp-btn--block hp-btn--lg" [disabled]="loading()">
            <span class="hp-spin" *ngIf="loading()"></span>
            {{ loading() ? 'بيتم الحفظ...' : 'احفظ كلمة المرور' }}
          </button>
        </form>
      </ng-container>
    </hp-auth-card>
  `,
  styles: [`.switch { text-align: center; font-size: var(--hp-text-sm); margin-top: var(--hp-space-4); }`],
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly password = signal('');
  readonly confirm = signal('');
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly linkExpired = signal(false);

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;

    const problem = passwordProblem(this.password());
    if (problem) {
      this.error.set(problem);
      this.linkExpired.set(false);
      return;
    }
    if (this.password() !== this.confirm()) {
      this.error.set('كلمتين المرور مش متطابقتين.');
      this.linkExpired.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.linkExpired.set(false);
    this.auth.resetPassword(this.token, this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        // السيرفر بيرد 400 لو الرابط منتهي أو اتستخدم قبل كده.
        this.linkExpired.set(true);
        this.error.set(apiErrorMessage(err, 'الرابط منتهي أو مش صالح.'));
      },
    });
  }
}

/** نفس قواعد validators/auth.validators.ts في السيرفر، برسائل عربي. */
export function passwordProblem(value: string): string | null {
  if (value.length < 8) return 'كلمة المرور لازم تكون ٨ حروف على الأقل.';
  if (!/[A-Z]/.test(value)) return 'كلمة المرور لازم فيها حرف إنجليزي كبير (A-Z).';
  if (!/[a-z]/.test(value)) return 'كلمة المرور لازم فيها حرف إنجليزي صغير (a-z).';
  if (!/[0-9]/.test(value)) return 'كلمة المرور لازم فيها رقم.';
  return null;
}
