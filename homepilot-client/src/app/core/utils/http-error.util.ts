import { HttpErrorResponse } from '@angular/common/http';

/**
 * كل أخطاء الـ API بترجع بالشكل: { success:false, message, errors }
 * (middleware/errorHandler.middleware.ts في السيرفر). الدالة دي بتطلع
 * أنسب رسالة للعرض، وبترجع نص عربي عام لو مفيش اتصال بالسيرفر أصلًا.
 */
export function apiErrorMessage(error: unknown, fallback = 'حصل خطأ غير متوقع، حاول تاني.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'مش قادرين نوصل للسيرفر. اتأكد إن الباك إند شغّال وحاول تاني.';
    }
    const body = error.error as { message?: string } | null;
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  }
  return fallback;
}
