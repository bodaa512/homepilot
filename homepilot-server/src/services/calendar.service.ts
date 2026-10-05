import { MaintenanceTask } from '../models/MaintenanceTask';
import { Appointment } from '../models/Appointment';
import { Subscription } from '../models/Subscription';
import { Asset } from '../models/Asset';
import { assertHomeAccess } from './authorization.service';

export type CalendarEventType = 'maintenance' | 'appointment' | 'subscription_renewal' | 'warranty_expiration';

export interface CalendarEvent {
  type: CalendarEventType;
  title: string;
  date: Date;
  entityId: string;
}

export const CalendarService = {
  /**
   * Returns every date-anchored thing tied to a home — maintenance due
   * dates, scheduled appointments, subscription renewals, and warranty
   * expirations — as one sorted list, per ARCHITECTURE.md §27.
   */
  async getEvents(userId: string, homeId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    await assertHomeAccess(userId, homeId);

    const [tasks, appointments, subscriptions, assetsWithWarranty] = await Promise.all([
      MaintenanceTask.find({
        home: homeId,
        dueDate: { $gte: from, $lte: to },
        status: { $nin: ['COMPLETED', 'CANCELLED'] },
      }).select('title dueDate'),
      Appointment.find({ home: homeId, date: { $gte: from, $lte: to } })
        .populate('provider', 'businessName')
        .select('date provider status'),
      Subscription.find({ home: homeId, nextBillingDate: { $gte: from, $lte: to }, isActive: true }).select(
        'name nextBillingDate',
      ),
      Asset.find({ home: homeId, warrantyExpiration: { $gte: from, $lte: to } }).select('name warrantyExpiration'),
    ]);

    const events: CalendarEvent[] = [
      ...tasks.map((t) => ({
        type: 'maintenance' as const,
        title: t.title,
        date: t.dueDate,
        entityId: t._id.toString(),
      })),
      ...appointments.map((a) => ({
        type: 'appointment' as const,
        title: `موعد مع ${(a.provider as unknown as { businessName: string })?.businessName ?? 'مزود الخدمة'}`,
        date: a.date,
        entityId: a._id.toString(),
      })),
      ...subscriptions.map((s) => ({
        type: 'subscription_renewal' as const,
        title: `تجديد اشتراك: ${s.name}`,
        date: s.nextBillingDate,
        entityId: s._id.toString(),
      })),
      ...assetsWithWarranty.map((a) => ({
        type: 'warranty_expiration' as const,
        title: `انتهاء ضمان: ${a.name}`,
        date: a.warrantyExpiration!,
        entityId: a._id.toString(),
      })),
    ];

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  },
};
