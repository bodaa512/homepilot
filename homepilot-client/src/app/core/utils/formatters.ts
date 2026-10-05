/**
 * أدوات تنسيق موحّدة — كل رقم أو تاريخ بيتعرض للمستخدم لازم يعدّي من هنا
 * بدل ما كل كومبوننت يعمل تنسيقه الخاص (وده كان أحد أسباب اختلاف الشكل
 * بين الشاشات لما البيانات كانت mock).
 */

const numberFormatter = (fractionDigits: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

/** ٣٬٤٨٠ بدل 3480 — أرقام عربية وفاصلة آلاف عربية. */
export function formatArabicNumber(value: number, fractionDigits = 0): string {
  return numberFormatter(fractionDigits).format(value);
}

/** ١٬٤٢٠ ج.م — نفس التنسيق مع وحدة الجنيه. */
export function formatCurrency(value: number, currency = 'EGP'): string {
  const amount = formatArabicNumber(value);
  return currency === 'EGP' ? `${amount} ج.م` : `${amount} ${currency}`;
}

/** ١٤ يونيو ٢٠٢٦ / ٨ سبتمبر — تاريخ ميلادي بأسماء شهور عربية وأرقام عربية. */
export function formatArabicDate(value: string | Date, withYear = true): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: withYear ? 'numeric' : undefined,
    calendar: 'gregory',
  }).format(date);
}

/** يومين / ٦ أيام / ١٢ يوم — جمع عربي سليم حسب العدد. */
export function arabicDayCount(n: number): string {
  const digits = formatArabicNumber(n);
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومين';
  if (n >= 3 && n <= 10) return `${digits} أيام`;
  return `${digits} يوم`;
}

/** شهرين / ٨ شهور / ١٤ شهر — نفس منطق arabicDayCount لكن بالشهور. */
export function arabicMonthCount(n: number): string {
  const digits = formatArabicNumber(n);
  if (n === 1) return 'شهر واحد';
  if (n === 2) return 'شهرين';
  if (n >= 3 && n <= 10) return `${digits} شهور`;
  return `${digits} شهر`;
}

/** "باقي ٦ أيام" / "فات ١٢ يوم" / "النهاردة"، مع فرق الأيام الخام لأي حسابات تانية. */
export function relativeDayLabel(target: string | Date, now: Date = new Date()): { label: string; days: number } {
  const targetDate = typeof target === 'string' ? new Date(target) : target;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(targetDate) - startOfDay(now)) / 86_400_000);

  if (days === 0) return { label: 'النهاردة', days };
  if (days < 0) return { label: `فات ${arabicDayCount(Math.abs(days))}`, days };
  return { label: `باقي ${arabicDayCount(days)}`, days };
}

/** بداية/نهاية شهر معيّن كـ ISO strings — offset=0 الشهر الحالي، -1 اللي فات، إلخ. */
export function monthRange(offset = 0): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** اسم الشهر الحالي بالعربي — "سبتمبر ٢٠٢٦". */
export function currentMonthLabel(): string {
  return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric', calendar: 'gregory' }).format(new Date());
}

