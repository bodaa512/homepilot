import { AuditLog } from '../models/AuditLog';

interface LogInput {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export const AuditLogService = {
  async log(input: LogInput): Promise<void> {
    // Fire-and-forget by design: an audit-log write failure must never
    // block or fail the user-facing action it's recording.
    try {
      await AuditLog.create(input);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[audit-log] failed to record entry:', error);
    }
  },

  async list(filters: { actor?: string; entityType?: string; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filters.actor) query['actor'] = filters.actor;
    if (filters.entityType) query['entityType'] = filters.entityType;

    return AuditLog.find(query)
      .populate('actor', 'fullName email')
      .sort({ timestamp: -1 })
      .limit(filters.limit ?? 100);
  },
};
