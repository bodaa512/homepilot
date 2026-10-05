import { MaintenanceService } from '../services/maintenance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const MaintenanceController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const tasks = await MaintenanceService.listTasks(requireUserId(req), req.params.homeId, { status });
    sendSuccess(res, { tasks });
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await MaintenanceService.createTask(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { task }, 'Maintenance task created', 201);
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await MaintenanceService.updateTask(requireUserId(req), req.params.taskId, req.body);
    sendSuccess(res, { task }, 'Maintenance task updated');
  }),

  complete: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await MaintenanceService.completeTask(requireUserId(req), req.params.taskId);
    sendSuccess(res, { task }, 'Task marked as completed');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await MaintenanceService.deleteTask(requireUserId(req), req.params.taskId);
    sendSuccess(res, null, 'Maintenance task deleted');
  }),
};
