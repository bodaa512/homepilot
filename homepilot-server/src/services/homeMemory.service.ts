import { Asset } from '../models/Asset';
import { MaintenanceTask, MaintenanceStatus } from '../models/MaintenanceTask';
import { Expense } from '../models/Expense';
import { Document } from '../models/Document';
import { assertHomeAccess } from './authorization.service';

interface MemoryEntry {
  date: Date;
  text: string;
}

export const HomeMemoryService = {
  async getMemory(userId: string, homeId: string): Promise<MemoryEntry[]> {
    await assertHomeAccess(userId, homeId);

    const [assets, completedTasks, expenses, documents] = await Promise.all([
      Asset.find({ home: homeId, purchaseDate: { $exists: true } }).select('name purchaseDate purchasePrice'),
      MaintenanceTask.find({ home: homeId, status: MaintenanceStatus.COMPLETED }).select('title completedAt'),
      Expense.find({ home: homeId, category: 'repairs' }).select('amount date description'),
      Document.find({ home: homeId }).select('type originalName createdAt'),
    ]);

    const entries: MemoryEntry[] = [
      ...assets.map((a) => ({
        date: a.purchaseDate!,
        text: `تم شراء "${a.name}"${a.purchasePrice ? ` بمبلغ ${a.purchasePrice} جنيه` : ''}`,
      })),
      ...completedTasks
        .filter((t) => t.completedAt)
        .map((t) => ({ date: t.completedAt!, text: `تم إكمال صيانة: "${t.title}"` })),
      ...expenses.map((e) => ({
        date: e.date,
        text: `تم تسجيل مصروف إصلاح بقيمة ${e.amount} جنيه${e.description ? ` — ${e.description}` : ''}`,
      })),
      ...documents.map((d) => ({ date: d.createdAt, text: `تم رفع مستند: "${d.originalName}"` })),
    ];

    // Repeated-repair pattern detection — the one genuinely "smart" insight
    // Home Memory adds beyond a plain chronological log.
    const repairCountByDescription = new Map<string, number>();
    for (const e of expenses) {
      const key = (e.description ?? 'غير محدد').trim();
      repairCountByDescription.set(key, (repairCountByDescription.get(key) ?? 0) + 1);
    }
    for (const [desc, count] of repairCountByDescription) {
      if (count >= 2 && desc !== 'غير محدد') {
        entries.push({
          date: new Date(),
          text: `ملاحظة: "${desc}" تكرر إصلاحه ${count} مرات — قد يستحق تقييم استبداله بدلاً من الاستمرار في إصلاحه.`,
        });
      }
    }

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  },
};
