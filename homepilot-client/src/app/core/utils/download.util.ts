/**
 * تنزيل مستند محتاج هيدر Authorization (الراوت محمي بـ requireAuth)،
 * فمينفعش نستخدم <a href> عادي — لازم نجيب الملف كـ blob عن طريق
 * HttpClient (وهو بياخد الهيدر من الـ interceptor زي أي نداء تاني)
 * ونبدأ التنزيل يدويًا بعد كده.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
