/** يطابق MaintenanceStatus/MaintenanceTaskType في السيرفر (models/MaintenanceTask.ts). */
export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED' | 'CANCELLED';
export type MaintenanceTaskType = 'one_time' | 'recurring' | 'ai_generated' | 'manufacturer' | 'manual';

export interface MaintenanceTask {
  _id: string;
  home: string;
  asset?: { _id: string; name: string } | null;
  title: string;
  description?: string;
  type: MaintenanceTaskType;
  recurrenceIntervalDays?: number;
  status: MaintenanceStatus;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
}

export interface CreateMaintenanceTaskPayload {
  title: string;
  dueDate: string;
  description?: string;
  recurrenceIntervalDays?: number;
}
