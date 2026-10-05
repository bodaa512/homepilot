import { ExpenseService } from '../services/expense.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const ExpenseController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { from, to, category } = req.query;
    const expenses = await ExpenseService.listExpenses(requireUserId(req), req.params.homeId, {
      from: typeof from === 'string' ? new Date(from) : undefined,
      to: typeof to === 'string' ? new Date(to) : undefined,
      category: typeof category === 'string' ? category : undefined,
    });
    sendSuccess(res, { expenses });
  }),

  analytics: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const analytics = await ExpenseService.getAnalytics(requireUserId(req), req.params.homeId);
    sendSuccess(res, analytics);
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expense = await ExpenseService.createExpense(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { expense }, 'Expense recorded', 201);
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expense = await ExpenseService.updateExpense(requireUserId(req), req.params.expenseId, req.body);
    sendSuccess(res, { expense }, 'Expense updated');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await ExpenseService.deleteExpense(requireUserId(req), req.params.expenseId);
    sendSuccess(res, null, 'Expense deleted');
  }),
};
