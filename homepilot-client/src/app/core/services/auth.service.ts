import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import {
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../models/auth.model';

export type SessionStatus = 'unknown' | 'authenticated' | 'guest';

/**
 * بيدير جلسة الدخول. التوكن القصير (accessToken) بيتخزن في الذاكرة بس
 * (signal) مش localStorage، عشان يقلل التعرّض لو حصل XSS — استرجاعه بعد
 * أي إعادة تحميل للصفحة بيتم عن طريق /auth/refresh اللي بيقرا الكوكي
 * الآمن (httpOnly) اللي السيرفر حطّه وقت الدخول. شوف ensureSession().
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly statusSignal = signal<SessionStatus>('unknown');

  readonly user = this.userSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');

  private sessionCheck$: Observable<AuthUser | null> | null = null;

  /** التوكن الحالي — الـ interceptor بيستخدمه، ومش محتاج حد تاني يناديه. */
  currentAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.authUrl}/login`, payload, { withCredentials: true })
      .pipe(map((res) => this.applySession(res.data)));
  }

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.authUrl}/register`, payload, { withCredentials: true })
      .pipe(map((res) => this.applySession(res.data)));
  }

  /** بيستخدم كوكي الـ refresh (httpOnly) عشان يجيب accessToken جديد. */
  refresh(): Observable<AuthUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.authUrl}/refresh`, {}, { withCredentials: true })
      .pipe(map((res) => this.applySession(res.data)));
  }

  logout(): Observable<void> {
    return this.http.post<ApiEnvelope<null>>(`${this.authUrl}/logout`, {}, { withCredentials: true }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  // ------------------------------- الحساب (حسابي) -------------------------------

  /** بيجيب بيانات المستخدم الحالية من السيرفر ويحدّثها في الواجهة (مثلًا بعد تفعيل الإيميل). */
  refreshProfile(): Observable<AuthUser> {
    return this.http
      .get<ApiEnvelope<{ user: AuthUser }>>(`${this.authUrl}/me`)
      .pipe(map((res) => this.applyUser(res.data.user)));
  }

  /** تعديل الاسم والتليفون. */
  updateProfile(payload: UpdateProfilePayload): Observable<AuthUser> {
    return this.http
      .patch<ApiEnvelope<{ user: AuthUser }>>(`${this.authUrl}/me`, payload)
      .pipe(map((res) => this.applyUser(res.data.user)));
  }

  /**
   * تغيير كلمة المرور. السيرفر بيلغي كل الجلسات القديمة وبيرجّع توكن جديد
   * للجلسة دي، فلازم نستبدل بيه الحالي وإلا المستخدم هيتطرد بعد دقايق.
   */
  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.authUrl}/change-password`, payload, { withCredentials: true })
      .pipe(map((res) => void this.applySession(res.data)));
  }

  /** يبعت رابط تفعيل جديد لإيميل المستخدم الحالي. */
  resendVerification(): Observable<{ alreadyVerified: boolean }> {
    return this.http
      .post<ApiEnvelope<{ alreadyVerified: boolean }>>(`${this.authUrl}/resend-verification`, {})
      .pipe(
        tap((res) => {
          if (res.data.alreadyVerified) this.markEmailVerified();
        }),
        map((res) => res.data),
      );
  }

  // ------------------------------- روابط الإيميل (من غير تسجيل دخول) -------------------------------

  forgotPassword(email: string): Observable<void> {
    return this.http.post<ApiEnvelope<null>>(`${this.authUrl}/forgot-password`, { email }).pipe(map(() => undefined));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.authUrl}/reset-password`, { token, newPassword })
      .pipe(map(() => undefined));
  }

  /** لو المستخدم داخل بنفس الحساب اللي اتفعّل، الشريط التنبيهي بيختفي فورًا. */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<ApiEnvelope<{ user: AuthUser }>>(`${this.authUrl}/verify-email`, { token }).pipe(
      tap((res) => {
        const current = this.userSignal();
        const verified = res.data.user;
        if (current && (current._id === verified._id || current.email === verified.email)) {
          this.markEmailVerified();
        }
      }),
      map(() => undefined),
    );
  }

  /**
   * بتتنادى مرة واحدة بس (من الـ guards) لأول تحميل للتطبيق: بتحاول
   * تسترجع الجلسة من كوكي الـ refresh. النتيجة متخزّنة (shareReplay)
   * عشان لو أكتر من guard/كومبوننت نادوها بالتوازي، يحصل نداء واحد بس.
   */
  ensureSession(): Observable<AuthUser | null> {
    if (this.statusSignal() !== 'unknown') {
      return of(this.userSignal());
    }
    if (!this.sessionCheck$) {
      this.sessionCheck$ = this.refresh().pipe(
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        shareReplay(1),
      );
    }
    return this.sessionCheck$;
  }

  private applySession(session: AuthSession): AuthUser {
    this.userSignal.set(session.user);
    this.accessTokenSignal.set(session.accessToken);
    this.statusSignal.set('authenticated');
    return session.user;
  }

  /** تحديث بيانات المستخدم من غير ما نلمس التوكن. */
  private applyUser(user: AuthUser): AuthUser {
    this.userSignal.set(user);
    return user;
  }

  private markEmailVerified(): void {
    const current = this.userSignal();
    if (current && !current.isEmailVerified) {
      this.userSignal.set({ ...current, isEmailVerified: true });
    }
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.statusSignal.set('guest');
    this.sessionCheck$ = null;
  }
}
