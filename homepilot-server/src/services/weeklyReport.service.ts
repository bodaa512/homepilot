import { MaintenanceTask, MaintenanceStatus } from '../models/MaintenanceTask';
import { Asset } from '../models/Asset';
import { Expense } from '../models/Expense';
import { assertHomeAccess } from './authorization.service';
import { Types } from 'mongoose';

export const WeeklyReportService = {
  async generate(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [completedThisWeek, upcomingTasks, overdueTasks, expenseAgg, expiringWarranties] = await Promise.all([
      MaintenanceTask.countDocuments({
        home: homeId,
        status: MaintenanceStatus.COMPLETED,
        completedAt: { $gte: sevenDaysAgo },
      }),
      MaintenanceTask.find({ home: homeId, status: MaintenanceStatus.PENDING, dueDate: { $gte: now, $lte: in7Days } }).select(
        'title dueDate',
      ),
      MaintenanceTask.countDocuments({ home: homeId, status: MaintenanceStatus.OVERDUE }),
      Expense.aggregate([
        { $match: { home: new Types.ObjectId(homeId), date: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Asset.find({
        home: homeId,
        warrantyExpiration: { $gte: now, $lte: in30Days },
      }).select('name warrantyExpiration'),
    ]);

    const recommendations: string[] = [];
    if (overdueTasks > 0) recommendations.push(`لديك ${overdueTasks} مهمة صيانة متأخرة تحتاج جدولة.`);
    if (expiringWarranties.length > 0) {
      recommendations.push(`راجع ضمانات: ${expiringWarranties.map((a) => a.name).join('، ')} قبل انتهائها.`);
    }
    if (upcomingTasks.length > 0) {
      recommendations.push(`لديك ${upcomingTasks.length} مهمة مجدولة الأسبوع القادم — تأكد من توفر الوقت لها.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('لا توجد إجراءات عاجلة هذا الأسبوع — استمر في المتابعة الدورية.');
    }

    return {
      maintenance: { completedThisWeek, upcoming: upcomingTasks.length, overdue: overdueTasks },
      expensesThisWeek: expenseAgg[0]?.total ?? 0,
      warrantiesExpiringSoon: expiringWarranties.map((a) => ({ name: a.name, expiresOn: a.warrantyExpiration })),
      recommendations,
      generatedAt: now,
    };
  },
};
