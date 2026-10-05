/** يطابق AchievementCode في السيرفر (models/Achievement.ts) — قايمة ثابتة معروفة مسبقًا. */
export type AchievementCode =
  | 'FIRST_HOME'
  | 'FIRST_ASSET'
  | 'MAINTENANCE_MASTER'
  | 'DOCUMENT_ORGANIZER'
  | 'BUDGET_SAVER'
  | 'WARRANTY_GUARDIAN';

export interface Achievement {
  _id: string;
  code: AchievementCode;
  unlockedAt: string;
}

/** السيرفر بيرجّع الكود بس — النص والوصف هنا في الفرونت. */
export const ACHIEVEMENT_INFO: Record<AchievementCode, { label: string; hint: string }> = {
  FIRST_HOME: { label: 'أول بيت', hint: 'ضفت أول بيت في حسابك.' },
  FIRST_ASSET: { label: 'أول جهاز', hint: 'سجّلت أول جهاز في بيتك.' },
  MAINTENANCE_MASTER: { label: 'سيد الصيانة', hint: 'خلّصت عدد كويس من مهام الصيانة.' },
  DOCUMENT_ORGANIZER: { label: 'منظّم المستندات', hint: 'رفعت مستندات مهمة لبيتك.' },
  BUDGET_SAVER: { label: 'موفّر شاطر', hint: 'بتتابع مصاريف بيتك بانتظام.' },
  WARRANTY_GUARDIAN: { label: 'حارس الضمان', hint: 'بتتابع ضمانات أجهزتك قبل ما تنتهي.' },
};

export const ACHIEVEMENT_CODES: AchievementCode[] = Object.keys(ACHIEVEMENT_INFO) as AchievementCode[];
