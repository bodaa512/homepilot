/**
 * بيئة الإنتاج — بتتبدّل مكان environment.ts تلقائيًا وقت
 * `ng build --configuration production` (شوف fileReplacements في angular.json).
 *
 * ⚠️ قبل ما تعمل build وترفع الفرونت إند: غيّر apiUrl تحت لدومين الباك
 * إند الحقيقي بعد نشره (مذكور في DEPLOYMENT.md). سيبها زي ما هي وهي
 * هتحاول تكلّم localhost من دومين حقيقي وهيفشل كل نداء API.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.your-homepilot-domain.com/api',
};
