import { Asset, AssetCondition } from '../models/Asset';
import { MaintenanceTask, MaintenanceStatus } from '../models/MaintenanceTask';
import { Expense, ExpenseCategory } from '../models/Expense';
import { HomeHealthScore } from '../models/HomeHealthScore';
import { assertHomeAccess } from './authorization.service';
import { Types } from 'mongoose';

// Weights sum to 100 — every point on the final score is traceable to one
// of these five dimensions, per the "no black box" requirement.
const WEIGHTS = {
  maintenance: 30,
  assetCondition: 25,
  warrantyCoverage: 20,
  repairCostTrend: 15,
  criticalAssetsRisk: 10,
};

const CONDITION_SCORE: Record<AssetCondition, number | null> = {
  [AssetCondition.NEW]: 100,
  [AssetCondition.GOOD]: 85,
  [AssetCondition.FAIR]: 65,
  [AssetCondition.NEEDS_ATTENTION]: 40,
  [AssetCondition.CRITICAL]: 15,
  [AssetCondition.RETIRED]: null, // excluded — a retired asset isn't a liability
};

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export const HomeHealthScoreService = {
  async calculate(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);

    const [tasks, assets, previous] = await Promise.all([
      MaintenanceTask.find({ home: homeId }),
      Asset.find({ home: homeId }),
      HomeHealthScore.findOne({ home: homeId }).sort({ calculatedAt: -1 }),
    ]);

    const reasons: string[] = [];

    // 1. Maintenance — share of active tasks that are NOT overdue.
    const activeTasks = tasks.filter((t) => t.status !== MaintenanceStatus.CANCELLED);
    const overdueTasks = activeTasks.filter((t) => t.status === MaintenanceStatus.OVERDUE);
    const maintenanceScore =
      activeTasks.length === 0 ? 100 : round(((activeTasks.length - overdueTasks.length) / activeTasks.length) * 100);
    if (overdueTasks.length > 0) {
      reasons.push(`${overdueTasks.length} مهمة صيانة متأخرة`);
    }

    // 2. Asset condition — average of each asset's condition score (RETIRED excluded).
    const scored = assets.map((a) => CONDITION_SCORE[a.condition]).filter((s): s is number => s !== null);
    const assetConditionScore = scored.length === 0 ? 100 : round(scored.reduce((a, b) => a + b, 0) / scored.length);

    // 3. Warranty coverage — of assets that track a warranty date at all,
    // what share are still within it.
    const trackable = assets.filter((a) => a.warrantyExpiration);
    const covered = trackable.filter((a) => a.warrantyExpiration! > new Date());
    const warrantyScore = trackable.length === 0 ? 100 : round((covered.length / trackable.length) * 100);
    const expiringSoonCount = trackable.filter((a) => {
      const daysLeft = (a.warrantyExpiration!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 30;
    }).length;
    if (expiringSoonCount > 0) {
      reasons.push(`${expiringSoonCount} ضمان سينتهي خلال 30 يومًا`);
    }

    // 4. Repair cost trend — last 3 months of "repairs" spending vs the 3 before that.
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const [recentRepairs, priorRepairs] = await Promise.all([
      Expense.aggregate([
        { $match: { home: new Types.ObjectId(homeId), category: ExpenseCategory.REPAIRS, date: { $gte: threeMonthsAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            home: new Types.ObjectId(homeId),
            category: ExpenseCategory.REPAIRS,
            date: { $gte: sixMonthsAgo, $lt: threeMonthsAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    const recentTotal = recentRepairs[0]?.total ?? 0;
    const priorTotal = priorRepairs[0]?.total ?? 0;
    let repairCostTrendScore = 100;
    if (priorTotal > 0 && recentTotal > priorTotal) {
      const increasePct = (recentTotal - priorTotal) / priorTotal;
      repairCostTrendScore = round(Math.max(0, 100 - increasePct * 100));
      if (increasePct > 0.2) {
        reasons.push(`تكاليف الإصلاح ارتفعت ${Math.round(increasePct * 100)}% خلال آخر 3 أشهر`);
      }
    }

    // 5. Critical assets risk — every CRITICAL-condition asset costs points directly.
    const criticalCount = assets.filter((a) => a.condition === AssetCondition.CRITICAL).length;
    const criticalAssetsRiskScore = round(Math.max(0, 100 - criticalCount * 25));
    if (criticalCount > 0) {
      reasons.push(`${criticalCount} جهاز في حالة حرجة ويحتاج تدخلًا`);
    }

    const totalScore = Math.round(
      (maintenanceScore * WEIGHTS.maintenance +
        assetConditionScore * WEIGHTS.assetCondition +
        warrantyScore * WEIGHTS.warrantyCoverage +
        repairCostTrendScore * WEIGHTS.repairCostTrend +
        criticalAssetsRiskScore * WEIGHTS.criticalAssetsRisk) /
        100,
    );

    if (reasons.length === 0) {
      reasons.push('لا توجد مخاطر ظاهرة حاليًا — استمر في المتابعة الدورية');
    }

    const record = await HomeHealthScore.create({
      home: homeId,
      score: totalScore,
      breakdown: {
        maintenance: maintenanceScore,
        assetCondition: assetConditionScore,
        warrantyCoverage: warrantyScore,
        repairCostTrend: repairCostTrendScore,
        criticalAssetsRisk: criticalAssetsRiskScore,
      },
      previousScore: previous?.score,
      reasons,
    });

    return { ...record.toObject(), weights: WEIGHTS };
  },
};
