/**
 * بيئة التطوير المحلي (ng serve). النسخة دي هي اللي الـ CLI بيستخدمها
 * بالـ default — نسخة الإنتاج موجودة في environment.prod.ts وبتتبدّل
 * مكانها وقت الـ build عن طريق fileReplacements في angular.json.
 *
 * apiUrl لازم يطابق env.clientUrl/PORT في السيرفر (homepilot-server/.env):
 * السيرفر بيشتغل افتراضيًا على http://localhost:5050 وكل الراوتس تحت /api.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5050/api',
};
