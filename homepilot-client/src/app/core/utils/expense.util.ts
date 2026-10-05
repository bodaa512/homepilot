import { EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS, Expense, ExpenseCategory } from '../models/expense.model';
import { formatArabicNumber } from './formatters';

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
}

export interface CategoryBar {
  label: string;
  amountLabel: string;
  percent: number;
  color: string;
}

/** بيجمّع مصاريف على فئات، مرتّبة من الأكبر للأصغر. */
export function groupExpensesByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<ExpenseCategory, number>();
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** بيحوّل مجموعات الفئات لأشرطة جاهزة للعرض — النسبة % من إجمالي كل الفئات، مش بس اللي ظاهرة. */
export function toCategoryBars(grouped: CategoryTotal[], limit = 4): CategoryBar[] {
  const overallTotal = grouped.reduce((sum, g) => sum + g.total, 0) || 1;
  return grouped.slice(0, limit).map((g, index) => ({
    label: EXPENSE_CATEGORY_LABELS[g.category],
    amountLabel: formatArabicNumber(g.total),
    percent: Math.round((g.total / overallTotal) * 100),
    color: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
  }));
}
