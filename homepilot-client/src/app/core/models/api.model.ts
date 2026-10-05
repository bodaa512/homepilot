/**
 * شكل الرد الموحّد من الباك إند (utils/apiResponse.ts في السيرفر).
 * كل الـ endpoints بترجّع الشكل ده — نجاح أو فشل.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** شكل رسالة الخطأ لما success تكون false (middleware/errorHandler.middleware.ts). */
export interface ApiErrorBody {
  success: false;
  message: string;
  errors: unknown[];
}
