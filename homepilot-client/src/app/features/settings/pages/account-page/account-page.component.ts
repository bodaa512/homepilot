import { NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { AuthService } from '../../../../core/services/auth.service';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';
import { passwordProblem } from '../../../auth/pages/reset-password/reset-password.component';

const PLAN_LABELS: Record<string, string> = {
  free: 'المجانية',
  premium: 'Premium',
  property_pro: 'Property Pro',
};

type Notice = { kind: 'ok' | 'error'; text: string } | null;

/**
 * حسابي — بيانات الحساب، حالة الإيميل، الباقة الحالية، وتغيير كلمة المرور.
 * كل قسم له رسالته الخاصة (نجاح/خطأ) جنب الزرار بتاعه، مش رسالة واحدة فوق الصفحة.
 */
@Component({
  selector: 'hp-account-page',
  standalone: true,
  imports: [NgIf, RouterLink, PageHeaderComponent],
  template: `
    <hp-page-header title="حسابي" subtitle="بياناتك، حالة الإيميل، باقتك، وكلمة المرور."></hp-page-header>

    <div class="account" *ngIf="user() as u">
      <!-- ------------------------------ البيانات ------------------------------ -->
      <section class="hp-block">
        <div class="hp-block__head"><h2>بياناتي</h2></div>
        <form class="hp-block__body hp-form-grid" (submit)="saveProfile($event)">
          <div class="hp-field">
            <label for="fullName">الاسم</label>
            <input id="fullName" type="text" required autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" />
          </div>
          <div class="hp-field">
            <label for="phone">رقم التليفون (اختياري)</label>
            <input id="phone" type="tel" dir="ltr" autocomplete="tel" placeholder="01012345678" [value]="phone()" (input)="phone.set($any($event.target).value)" />
          </div>
          <div class="hp-field hp-field--full">
            <label for="email">البريد الإلكتروني</label>
            <input id="email" type="email" dir="ltr" [value]="u.email" disabled />
            <span class="hp-hint">الإيميل ثابت ومش بيتغيّر من هنا.</span>
          </div>

          <div class="actions hp-field--full">
            <span class="notice" [class.notice--error]="profileNotice()?.kind === 'error'" *ngIf="profileNotice() as n" role="status">{{ n.text }}</span>
            <button type="submit" class="hp-btn hp-btn--primary" [disabled]="savingProfile() || !profileDirty()">
              <span class="hp-spin" *ngIf="savingProfile()"></span>
              {{ savingProfile() ? 'بيتم الحفظ...' : 'احفظ التعديلات' }}
            </button>
          </div>
        </form>
      </section>

      <!-- ------------------------------ الإيميل ------------------------------ -->
      <section class="hp-block">
        <div class="hp-block__head">
          <h2>تفعيل الإيميل</h2>
          <span class="hp-badge" [class.hp-badge--ok]="u.isEmailVerified" [class.hp-badge--due]="!u.isEmailVerified">
            {{ u.isEmailVerified ? 'متفعّل' : 'مش متفعّل' }}
          </span>
        </div>
        <div class="hp-block__body row">
          <p class="hp-muted grow" *ngIf="u.isEmailVerified">إيميلك <b dir="ltr">{{ u.email }}</b> متفعّل — هتوصلك التنبيهات والروابط عليه.</p>
          <p class="hp-muted grow" *ngIf="!u.isEmailVerified">
            لسه ما فعّلتش <b dir="ltr">{{ u.email }}</b>. افتح الرابط اللي وصلك، أو ابعت رابط جديد.
          </p>
          <ng-container *ngIf="!u.isEmailVerified">
            <span class="notice" [class.notice--error]="verifyNotice()?.kind === 'error'" *ngIf="verifyNotice() as n" role="status">{{ n.text }}</span>
            <button type="button" class="hp-btn hp-btn--sm" [disabled]="resending()" (click)="resend()">
              <span class="hp-spin" *ngIf="resending()"></span>
              ابعت رابط التفعيل
            </button>
          </ng-container>
        </div>
      </section>

      <!-- ------------------------------ الباقة ------------------------------ -->
      <section class="hp-block">
        <div class="hp-block__head"><h2>الباقة الحالية</h2></div>
        <div class="hp-block__body row">
          <div class="grow">
            <b class="plan">{{ planLabel() }}</b>
            <p class="hp-muted" *ngIf="renewal() as r">بتتجدد في {{ r }}</p>
            <p class="hp-muted" *ngIf="!renewal()">{{ u.planCode === 'free' ? 'ترقّي لما تحتاج بيوت أو مساعد ذكي أكتر.' : '' }}</p>
          </div>
          <a class="hp-btn hp-btn--sm" routerLink="/app/settings/billing">{{ u.planCode === 'free' ? 'شوف الباقات' : 'الاشتراك والفواتير' }}</a>
        </div>
      </section>

      <!-- ------------------------------ كلمة المرور ------------------------------ -->
      <section class="hp-block">
        <div class="hp-block__head"><h2>تغيير كلمة المرور</h2></div>
        <form class="hp-block__body hp-form-grid" (submit)="changePassword($event)">
          <div class="hp-field hp-field--full">
            <label for="currentPassword">كلمة المرور الحالية</label>
            <input id="currentPassword" type="password" autocomplete="current-password" required [value]="currentPassword()" (input)="currentPassword.set($any($event.target).value)" />
          </div>
          <div class="hp-field">
            <label for="newPassword">كلمة المرور الجديدة</label>
            <input id="newPassword" type="password" autocomplete="new-password" required [value]="newPassword()" (input)="newPassword.set($any($event.target).value)" />
            <span class="hp-hint">٨ حروف على الأقل، فيها حرف كبير وحرف صغير ورقم.</span>
          </div>
          <div class="hp-field">
            <label for="confirmPassword">تأكيد كلمة المرور الجديدة</label>
            <input id="confirmPassword" type="password" autocomplete="new-password" required [value]="confirmPassword()" (input)="confirmPassword.set($any($event.target).value)" />
          </div>

          <div class="actions hp-field--full">
            <span class="notice" [class.notice--error]="passwordNotice()?.kind === 'error'" *ngIf="passwordNotice() as n" role="status">{{ n.text }}</span>
            <button type="submit" class="hp-btn hp-btn--primary" [disabled]="changing()">
              <span class="hp-spin" *ngIf="changing()"></span>
              {{ changing() ? 'بيتم التغيير...' : 'غيّر كلمة المرور' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .account { display: flex; flex-direction: column; gap: var(--hp-space-4); max-width: 760px; }
      .row { display: flex; align-items: center; gap: var(--hp-space-3); flex-wrap: wrap; }
      .grow { flex: 1; min-width: 220px; margin: 0; }
      .plan { font-size: var(--hp-text-lg); }
      .actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--hp-space-3);
        flex-wrap: wrap;
      }
      .notice { font-size: var(--hp-text-sm); color: var(--hp-ok-text); }
      .notice--error { color: var(--hp-late-text); }
      input:disabled { background: var(--hp-surface-sunken); }
    `,
  ],
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;

  // ---- البيانات
  readonly name = signal(this.auth.user()?.fullName ?? '');
  readonly phone = signal(this.auth.user()?.phone ?? '');
  readonly savingProfile = signal(false);
  readonly profileNotice = signal<Notice>(null);
  readonly profileDirty = computed(() => {
    const u = this.user();
    return !!u && (this.name().trim() !== u.fullName || this.phone().trim() !== (u.phone ?? ''));
  });

  // ---- الإيميل
  readonly resending = signal(false);
  readonly verifyNotice = signal<Notice>(null);

  // ---- كلمة المرور
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly changing = signal(false);
  readonly passwordNotice = signal<Notice>(null);

  // ---- الباقة
  readonly planLabel = computed(() => PLAN_LABELS[this.user()?.planCode ?? 'free'] ?? this.user()?.planCode ?? '');
  readonly renewal = computed(() => {
    const at = this.user()?.planRenewsAt;
    return at ? formatArabicDate(at) : '';
  });

  saveProfile(event: Event): void {
    event.preventDefault();
    if (this.savingProfile()) return;

    const fullName = this.name().trim();
    if (fullName.length < 2) {
      this.profileNotice.set({ kind: 'error', text: 'الاسم لازم يكون حرفين على الأقل.' });
      return;
    }
    const phone = this.phone().trim();
    if (!/^[0-9+()\-\s]*$/.test(phone)) {
      this.profileNotice.set({ kind: 'error', text: 'رقم التليفون فيه رموز مش مسموحة — أرقام و + و - بس.' });
      return;
    }

    this.savingProfile.set(true);
    this.profileNotice.set(null);
    // phone فاضي = مسح الرقم المحفوظ (السيرفر بيتعامل معاه كده).
    this.auth.updateProfile({ fullName, phone }).subscribe({
      next: (u) => {
        this.savingProfile.set(false);
        this.name.set(u.fullName);
        this.phone.set(u.phone ?? '');
        this.profileNotice.set({ kind: 'ok', text: 'اتحفظت التعديلات.' });
      },
      error: (err: unknown) => {
        this.savingProfile.set(false);
        this.profileNotice.set({ kind: 'error', text: apiErrorMessage(err, 'مقدرناش نحفظ التعديلات — حاول تاني.') });
      },
    });
  }

  resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.verifyNotice.set(null);
    this.auth.resendVerification().subscribe({
      next: (res) => {
        this.resending.set(false);
        this.verifyNotice.set({
          kind: 'ok',
          text: res.alreadyVerified ? 'الإيميل متفعّل بالفعل.' : 'بعتنالك الرابط — شوف الإيميل (وفولدر الـ spam).',
        });
      },
      error: (err: unknown) => {
        this.resending.set(false);
        this.verifyNotice.set({ kind: 'error', text: apiErrorMessage(err, 'مقدرناش نبعت الرابط — حاول تاني.') });
      },
    });
  }

  changePassword(event: Event): void {
    event.preventDefault();
    if (this.changing()) return;

    const problem = passwordProblem(this.newPassword());
    if (problem) {
      this.passwordNotice.set({ kind: 'error', text: problem });
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordNotice.set({ kind: 'error', text: 'كلمتين المرور الجديدتين مش متطابقتين.' });
      return;
    }
    if (this.newPassword() === this.currentPassword()) {
      this.passwordNotice.set({ kind: 'error', text: 'كلمة المرور الجديدة لازم تختلف عن الحالية.' });
      return;
    }

    this.changing.set(true);
    this.passwordNotice.set(null);
    this.auth.changePassword({ currentPassword: this.currentPassword(), newPassword: this.newPassword() }).subscribe({
      next: () => {
        this.changing.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.passwordNotice.set({ kind: 'ok', text: 'اتغيّرت كلمة المرور. باقي أجهزتك اتسجّل خروجها.' });
      },
      error: (err: unknown) => {
        this.changing.set(false);
        this.passwordNotice.set({ kind: 'error', text: apiErrorMessage(err, 'مقدرناش نغيّر كلمة المرور — حاول تاني.') });
      },
    });
  }
}
