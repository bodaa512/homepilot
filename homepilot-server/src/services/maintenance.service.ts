import { MaintenanceTask, IMaintenanceTask, MaintenanceStatus, MaintenanceTaskType } from '../models/MaintenanceTask';
import { HomeMembership } from '../models/HomeMembership';
import { Asset } from '../models/Asset';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { NotificationService } from './notification.service';
import { NotificationType } from '../models/Notification';
import { AchievementService } from './achievement.service';

export const MaintenanceService = {
  async listTasks(userId: string, homeId: string, filters: { status?: string } = {}) {
    await assertHomeAccess(userId, homeId);
    const query: Record<string, unknown> = { home: homeId };
    if (filters.status) query['status'] = filters.status;
    return MaintenanceTask.find(query).populate('asset', 'name').sort({ dueDate: 1 });
  },

  async createTask(
    userId: string,
    homeId: string,
    input: Pick<IMaintenanceTask, 'title' | 'dueDate'> & Partial<IMaintenanceTask>,
  ) {
    await assertHomeAccess(userId, homeId, 'assets:manage');
    // Maintenance uses the same 'assets:manage' permission as assets/rooms for
    // now (OWNER/ADMIN) — a dedicated 'maintenance:manage' permission can be
    // split out later if maintenance-specific roles are ever needed.

    if (input.asset) {
      const asset = await Asset.findOne({ _id: input.asset, home: homeId });
      if (!asset) throw new ValidationError('Selected asset does not belong to this home');
    }

    const type = input.recurrenceIntervalDays ? MaintenanceTaskType.RECURRING : (input.type ?? MaintenanceTaskType.MANUAL);

    return MaintenanceTask.create({ ...input, type, home: homeId, createdBy: userId });
  },

  async updateTask(userId: string, taskId: string, updates: Partial<IMaintenanceTask>) {
    const task = await MaintenanceTask.findById(taskId);
    if (!task) throw new NotFoundError('Maintenance task not found');

    await assertHomeAccess(userId, task.home.toString(), 'assets:manage');

    Object.assign(task, updates);
    await task.save();
    return task;
  },

  async completeTask(userId: string, taskId: string) {
    const task = await MaintenanceTask.findById(taskId);
    if (!task) throw new NotFoundError('Maintenance task not found');

    // Completing a task only requires membership + the lighter
    // 'maintenance:complete' permission — MEMBER role can do this even
    // though only OWNER/ADMIN can create or edit tasks.
    await assertHomeAccess(userId, task.home.toString(), 'maintenance:complete');

    task.status = MaintenanceStatus.COMPLETED;
    task.completedAt = new Date();
    task.completedBy = userId as unknown as IMaintenanceTask['completedBy'];

    if (task.asset) {
      await Asset.findByIdAndUpdate(task.asset, { lastMaintenanceAt: new Date() });
    }

    await task.save();

    const completedCount = await MaintenanceTask.countDocuments({
      home: task.home,
      status: MaintenanceStatus.COMPLETED,
    });
    await AchievementService.checkMaintenanceMilestone(userId, completedCount);

    // If this was a recurring task, spin up the next occurrence automatically.
    if (task.type === MaintenanceTaskType.RECURRING && task.recurrenceIntervalDays) {
      const nextDueDate = new Date(task.dueDate);
      nextDueDate.setDate(nextDueDate.getDate() + task.recurrenceIntervalDays);
      await MaintenanceTask.create({
        home: task.home,
        asset: task.asset,
        title: task.title,
        description: task.description,
        type: MaintenanceTaskType.RECURRING,
        recurrenceIntervalDays: task.recurrenceIntervalDays,
        dueDate: nextDueDate,
        createdBy: task.createdBy,
      });
    }

    return task;
  },

  async deleteTask(userId: string, taskId: string) {
    const task = await MaintenanceTask.findById(taskId);
    if (!task) throw new NotFoundError('Maintenance task not found');
    await assertHomeAccess(userId, task.home.toString(), 'assets:manage');
    await task.deleteOne();
  },

  /**
   * Run by the daily cron job (see jobs/maintenanceCheck.ts): flips any
   * PENDING task whose dueDate has passed to OVERDUE, and notifies every
   * active member of that task's home.
   */
  async flagOverdueTasks(): Promise<number> {
    const overdueTasks = await MaintenanceTask.find({
      status: MaintenanceStatus.PENDING,
      dueDate: { $lt: new Date() },
    });

    for (const task of overdueTasks) {
      task.status = MaintenanceStatus.OVERDUE;
      await task.save();

      const members = await HomeMembership.find({ home: task.home, status: 'active' });
      await Promise.all(
        members.map((m) =>
          NotificationService.create({
            user: m.user.toString(),
            type: NotificationType.MAINTENANCE,
            title: `Overdue: ${task.title}`,
            body: `This task was due on ${task.dueDate.toDateString()}.`,
            priority: 'high',
            relatedEntityType: 'MaintenanceTask',
            relatedEntityId: task._id.toString(),
            actionUrl: `/maintenance`,
          }),
        ),
      );
    }

    return overdueTasks.length;
  },
};
