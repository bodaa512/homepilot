import cron from 'node-cron';
import { MaintenanceService } from '../services/maintenance.service';

/**
 * Runs once a day at 06:00 server time. Kept intentionally small and
 * single-purpose for Phase 5 — warranty reminders, subscription reminders,
 * and the weekly report job are added the same way in later phases.
 */
export function scheduleMaintenanceCheck(): void {
  cron.schedule('0 6 * * *', async () => {
    try {
      const count = await MaintenanceService.flagOverdueTasks();
      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log(`[cron:maintenanceCheck] flagged ${count} task(s) as overdue`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[cron:maintenanceCheck] failed:', error);
    }
  });
}
