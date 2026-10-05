// نسخة صريحة لإعدادات التطوير — نفس environment.ts، موجودة عشان
// configuration "development" في angular.json تقدر تستخدمها بالاسم
// لو احتجنا مستقبلًا نفرّق بينها وبين الـ default. حاليًا نفس القيم.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5050/api',
};
