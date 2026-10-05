import { NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthCardComponent } from '../../../../shared/ui/auth-card.component';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type VerifyState = 'working' | 'ok' | 'error';

/**
 * الرابط اللي السيرفر بيبعته في الإيميل: /verify-email?token=...
 * بيتفعّل أوتوماتيك أول ما الصفحة تفتح. مفتوحة للكل (داخل أو لأ) لأن الرابط
 * ممكن يتفتح من موبايل المستخدم مش من نفس المتصفح اللي سجّل منه.
 */
@Component({
  selector: 'hp-verify-email',
  standalone: true,
  imports: [NgIf, RouterLink, AuthCardComponent],
  template: `
    <hp-auth-card title="تفعيل الإيميل">
      <p class="state" *ngIf="state() === 'working'"><span class="hp-spin"></span> بنفعّل إيميلك...</p>

      <ng-container *ngIf="state() === 'ok'">
        <div class="hp-alert hp-alert--info">تمام! إيميلك اتفعّل.</div>
        <a class="hp-btn hp-btn--primary hp-btn--block hp-btn--lg" [routerLink]="auth.isAuthenticated() ? '/app/home' : '/auth/login'" style="margin-top: var(--hp-space-4)">
          {{ auth.isAuthenticated() ? 'كمّل للتطبيق' : 'سجّل الدخول' }}
        </a>
      </ng-container>

      <ng-container *ngIf="state() === 'error'">
        <div class="hp-alert hp-alert--error">{{ error() }}</div>
        <p class="switch">
          <a [routerLink]="auth.isAuthenticated() ? '/app/settings' : '/auth/login'">
            {{ auth.isAuthenticated() ? 'ابعت رابط جديد من حسابي' : 'سجّل الدخول وهنبعتلك رابط جديد' }}
          </a>
        </p>
      </ng-container>
    </hp-auth-card>
  `,
  styles: [
    `
      .state { display: flex; align-items: center; gap: var(--hp-space-2); color: var(--hp-text-muted); }
      .switch { text-align: center; font-size: var(--hp-text-sm); margin-top: var(--hp-space-4); }
    `,
  ],
})
export class VerifyEmailComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly state = signal<VerifyState>('working');
  readonly error = signal('');

  ngOnInit(): void {
    if (!this.token) {
      this.state.set('error');
      this.error.set('الرابط ناقص أو مش صحيح.');
      return;
    }
    // الأول نتأكد لو فيه جلسة شغّالة (كوكي الـ refresh)، عشان الشريط التنبيهي يختفي
    // لو المستخدم فتح الرابط من نفس المتصفح وهو داخل.
    this.auth
      .ensureSession()
      .pipe(switchMap(() => this.auth.verifyEmail(this.token)))
      .subscribe({
        next: () => this.state.set('ok'),
        error: (err: unknown) => {
          this.state.set('error');
          this.error.set(apiErrorMessage(err, 'الرابط منتهي أو مش صالح.'));
        },
      });
  }
}
