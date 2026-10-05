import { MaintenanceTask, MaintenanceStatus } from '../models/MaintenanceTask';
import { Asset } from '../models/Asset';
import { Expense } from '../models/Expense';
import { ServiceRequest } from '../models/ServiceRequest';
import { HomeHealthScore } from '../models/HomeHealthScore';
import { Home } from '../models/Home';
import { Types } from 'mongoose';

/**
 * Builds the ONLY data the AI ever sees for a given home: aggregated,
 * already-authorized facts — never raw documents, never other users' data,
 * never fields beyond what's listed here. This is the enforcement point
 * described in ARCHITECTURE.md §75/§77.
 */
export async function buildHomeAIContext(homeId: string): Promise<string> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [home, overdueTasks, upcomingTasks, assets, monthExpenses, openRequests, latestScore] = await Promise.all([
    Home.findById(homeId).select('name type city'),
    MaintenanceTask.find({ home: homeId, status: MaintenanceStatus.OVERDUE }).select('title dueDate'),
    MaintenanceTask.find({
      home: homeId,
      status: MaintenanceStatus.PENDING,
      dueDate: { $gte: now, $lte: in7Days },
    }).select('title dueDate'),
    Asset.find({ home: homeId }).select('name category condition warrantyExpiration totalRepairCost'),
    Expense.aggregate([
      { $match: { home: new Types.ObjectId(homeId), date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
    ServiceRequest.find({ home: homeId, status: { $nin: ['COMPLETED', 'REVIEWED', 'CANCELLED'] } }).select('title status'),
    HomeHealthScore.findOne({ home: homeId }).sort({ calculatedAt: -1 }).select('score reasons'),
  ]);

  const expiringWarranties = assets.filter(
    (a) => a.warrantyExpiration && a.warrantyExpiration > now && a.warrantyExpiration <= in30Days,
  );

  const lines: string[] = [];
  lines.push(`المنزل: ${home?.name ?? 'غير معروف'} (${home?.type ?? ''}, ${home?.city ?? ''})`);
  if (latestScore) lines.push(`مؤشر صحة المنزل: ${latestScore.score}/100. أسباب: ${latestScore.reasons.join('؛ ')}`);
  lines.push(`عدد الأجهزة المسجلة: ${assets.length}`);
  lines.push(
    `مهام صيانة متأخرة (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join('، ') || 'لا يوجد'}`,
  );
  lines.push(
    `مهام صيانة قادمة خلال 7 أيام (${upcomingTasks.length}): ${upcomingTasks.map((t) => t.title).join('، ') || 'لا يوجد'}`,
  );
  lines.push(
    `ضمانات تنتهي خلال 30 يومًا (${expiringWarranties.length}): ${expiringWarranties.map((a) => a.name).join('، ') || 'لا يوجد'}`,
  );
  const totalMonthExpense = monthExpenses.reduce((sum: number, e: { total: number }) => sum + e.total, 0);
  lines.push(`إجمالي مصروفات هذا الشهر: ${totalMonthExpense} جنيه`);
  lines.push(`طلبات خدمة مفتوحة حاليًا: ${openRequests.map((r) => `${r.title} (${r.status})`).join('، ') || 'لا يوجد'}`);

  const highRepairAssets = assets.filter((a) => a.totalRepairCost > 0).sort((a, b) => b.totalRepairCost - a.totalRepairCost);
  if (highRepairAssets.length > 0) {
    lines.push(
      `الأجهزة ذات أعلى تكلفة إصلاح تراكمية: ${highRepairAssets
        .slice(0, 3)
        .map((a) => `${a.name} (${a.totalRepairCost} جنيه)`)
        .join('، ')}`,
    );
  }

  return lines.join('\n');
}
