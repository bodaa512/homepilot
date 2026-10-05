import { Schema, model, Document, Types } from 'mongoose';

export enum AchievementCode {
  FIRST_HOME = 'FIRST_HOME',
  FIRST_ASSET = 'FIRST_ASSET',
  MAINTENANCE_MASTER = 'MAINTENANCE_MASTER',
  DOCUMENT_ORGANIZER = 'DOCUMENT_ORGANIZER',
  BUDGET_SAVER = 'BUDGET_SAVER',
  WARRANTY_GUARDIAN = 'WARRANTY_GUARDIAN',
}

export interface IAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  code: AchievementCode;
  unlockedAt: Date;
}

const achievementSchema = new Schema<IAchievement>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, enum: Object.values(AchievementCode), required: true },
  unlockedAt: { type: Date, default: Date.now },
});

achievementSchema.index({ user: 1, code: 1 }, { unique: true });

export const Achievement = model<IAchievement>('Achievement', achievementSchema);
