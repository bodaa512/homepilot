import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * نداءات الـ auth اللي مابتحتاجش توكن (أو هي نفسها اللي بتجيب التوكن): لو رجّعت 401
 * يبقى ده خطأ حقيقي (إيميل/باسورد غلط، لينك منتهي...) مش توكن منتهي، فمفيش
 * معنى نحاول refresh ونعيد الطلب — وده كمان بيمنع الدوران اللانهائي على /auth/refresh.
 *
 * أما باقي نداءات /auth (حسابي، تغيير كلمة المرور، إعادة إرسال التفعيل، الخروج)
 * فمحمية بالتوكن، فلازم تتعامل زي أي نداء محمي: لو التوكن انتهى يتجدّد ويتعاد الطلب.
 * قبل كده كانت كلها مستثناة، فشاشة "حسابي" كانت بتفشل بعد ١٥ دقيقة من الدخول.
 */
const PUBLIC_AUTH_ENDPOINTS = ['login', 'register', 'refresh', 'forgot-password', 'reset-password', 'verify-email'];

/**
 * كل نداء لـ API بتاعنا بياخد:
 *  - Authorization: Bearer <accessToken> (لو المستخدم داخل)
 *  - withCredentials: true (عشان كوكي الـ refresh يتبعت وقت الحاجة —
 *    السيرفر مسموحله فقط لأن CLIENT_URL محدد بالاسم في CORS مش "*")
 * ولو رد السيرفر 401 على نداء محمي، بيحاول refresh مرة واحدة ويعيد الطلب
 * الأصلي؛ لو الـ refresh نفسه فشل، بينظّف الجلسة (الـ guard هيوجّه لصفحة الدخول).
 * أي خطأ تاني من الطلب المُعاد (400 مثلًا) بيوصل للشاشة زي ما هو من غير ما
 * يطرد المستخدم.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isPublicAuthEndpoint = PUBLIC_AUTH_ENDPOINTS.some((name) =>
    req.url.startsWith(`${environment.apiUrl}/auth/${name}`),
  );

  const attachAuth = (request: HttpRequest<unknown>): HttpRequest<unknown> => {
    if (!isApiRequest) return request;
    const token = auth.currentAccessToken();
    return request.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  return next(attachAuth(req)).pipe(
    catchError((error: unknown) => {
      const shouldRetryWithRefresh =
        error instanceof HttpErrorResponse && error.status === 401 && isApiRequest && !isPublicAuthEndpoint;

      if (!shouldRetryWithRefresh) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        // الـ catchError هنا قبل الـ switchMap عن قصد: بيمسك فشل الـ refresh بس، مش أخطاء الطلب المُعاد.
        catchError((refreshError: unknown) => {
          auth.clearSession();
          return throwError(() => refreshError);
        }),
        switchMap(() => next(attachAuth(req))),
      );
    }),
  );
};
