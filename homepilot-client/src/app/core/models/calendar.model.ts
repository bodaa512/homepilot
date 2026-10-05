/** يطابق CalendarEventType/CalendarEvent في السيرفر (services/calendar.service.ts). */
export type CalendarEventType = 'maintenance' | 'appointment' | 'subscription_renewal' | 'warranty_expiration';

export interface CalendarEvent {
  type: CalendarEventType;
  title: string;
  date: string;
  entityId: string;
}

export const CALENDAR_EVENT_META: Record<CalendarEventType, { icon: string; color: string }> = {
  maintenance: { icon: '🔧', color: 'var(--hp-due)' },
  appointment: { icon: '📅', color: 'var(--hp-info)' },
  subscription_renewal: { icon: '🔁', color: 'var(--hp-navy-400)' },
  warranty_expiration: { icon: '🛡️', color: 'var(--hp-late)' },
};
