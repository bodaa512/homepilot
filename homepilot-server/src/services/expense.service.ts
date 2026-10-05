import { Expense, IExpense } from '../models/Expense';
import { NotFoundError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { AchievementService } from './achievement.service';
import { Types } from 'mongoose';

export const ExpenseService = {
  async listExpenses(userId: string, homeId: string, filters: { from?: Date; to?: Date; category?: string } = {}) {
    await assertHomeAccess(userId, homeId);
    const query: Record<string, unknown> = { home: homeId };
    if (filters.category) query['category'] = filters.category;
    if (filters.from || filters.to) {
      query['date'] = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    return Expense.find(query).populate('asset', 'name').sort({ date: -1 });
  },

  async createExpense(
    userId: string,
    homeId: string,
    input: Pick<IExpense, 'amount' | 'category' | 'date'> & Partial<IExpense>,
  ) {
    await assertHomeAccess(userId, homeId, 'expenses:manage');
    const expense = await Expense.create({ ...input, home: homeId, createdBy: userId });

    const expenseCount = await Expense.countDocuments({ home: homeId });
    await AchievementService.checkBudgetMilestone(userId, expenseCount);

    return expense;
  },

  async updateExpense(userId: string, expenseId: string, updates: Partial<IExpense>) {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new NotFoundError('Expense not found');
    await assertHomeAccess(userId, expense.home.toString(), 'expenses:manage');
    Object.assign(expense, updates);
    await expense.save();
    return expense;
  },

  async deleteExpense(userId: string, expenseId: string) {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new NotFoundError('Expense not found');
    await assertHomeAccess(userId, expense.home.toString(), 'expenses:manage');
    await expense.deleteOne();
  },

  /**
   * Aggregates: total this month, total this year, and a spending-by-category
   * breakdown for the last 12 months. Kept as one endpoint so the frontend
   * can render its summary cards + category chart with a single request.
   */
  async getAnalytics(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [monthAgg, yearAgg, categoryAgg, monthlyTrend] = await Promise.all([
      Expense.aggregate([
        { $match: { home: expenseHomeMatch(homeId), date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { home: expenseHomeMatch(homeId), date: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { home: expenseHomeMatch(homeId), date: { $gte: twelveMonthsAgo } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: { home: expenseHomeMatch(homeId), date: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    return {
      totalThisMonth: monthAgg[0]?.total ?? 0,
      totalThisYear: yearAgg[0]?.total ?? 0,
      byCategory: categoryAgg.map((c) => ({ category: c._id, total: c.total })),
      monthlyTrend: monthlyTrend.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        total: m.total,
      })),
    };
  },
};

// Small helper so the $match stages above don't repeat the ObjectId cast.
function expenseHomeMatch(homeId: string) {
  return new Types.ObjectId(homeId);
}
