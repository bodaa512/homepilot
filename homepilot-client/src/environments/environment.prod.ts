/**
 * بيئة الإنتاج — بتتبدّل مكان environment.ts تلقائيًا وقت
 * `ng build --configuration production` (شوف fileReplacements في angular.json).
 *
 * apiUrl = '/api' (مسار نسبي) عن قصد: على Vercel الملف vercel.json بيحوّل أي طلب
 * يبدأ بـ /api للسيرفر الحقيقي. كده المتصفح بيكلّم نفس الدومين دايمًا، فكوكي
 * تسجيل الدخول (SameSite=Strict) بيشتغل، ومفيش مشاكل CORS.
 * لو هتستضيف الواجهة والسيرفر على دومينين مختلفين من غير proxy، غيّرها لرابط
 * السيرفر الكامل (ومعاها هتحتاج تظبط إعدادات الكوكي — شوف DEPLOYMENT.md).
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
