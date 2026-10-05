import { Achievement, AchievementCode } from '../models/Achievement';
import { NotificationService } from './notification.service';
import { NotificationType } from '../models/Notification';

const ACHIEVEMENT_TITLES: Record<AchievementCode, string> = {
  [AchievementCode.FIRST_HOME]: 'أول منزل',
  [AchievementCode.FIRST_ASSET]: 'أول جهاز',
  [AchievementCode.MAINTENANCE_MASTER]: 'خبير الصيانة',
  [AchievementCode.DOCUMENT_ORGANIZER]: 'منظّم المستندات',
  [AchievementCode.BUDGET_SAVER]: 'مدير الميزانية',
  [AchievementCode.WARRANTY_GUARDIAN]: 'حارس الضمانات',
};

async function unlock(userId: string, code: AchievementCode): Promise<void> {
  try {
    const created = await Achievement.findOneAndUpdate(
      { user: userId, code },
      { $setOnInsert: { user: userId, code, unlockedAt: new Date() } },
      { upsert: true, new: false }, // new:false so we can tell if it already existed
    );
    if (created) return; // already had it — findOneAndUpdate returned the pre-existing doc

    await NotificationService.create({
      user: userId,
      type: NotificationType.SYSTEM,
      title: `إنجاز جديد: ${ACHIEVEMENT_TITLES[code]}`,
      priority: 'low',
      relatedEntityType: 'Achievement',
    });
  } catch {
    // Duplicate-key races on the unique index are expected and harmless here.
  }
}

export const AchievementService = {
  async checkFirstHome(userId: string, ownedHomesCount: number): Promise<void> {
    if (ownedHomesCount === 1) await unlock(userId, AchievementCode.FIRST_HOME);
  },

  async checkFirstAsset(userId: string, assetCountForHome: number): Promise<void> {
    if (assetCountForHome === 1) await unlock(userId, AchievementCode.FIRST_ASSET);
  },

  async checkMaintenanceMilestone(userId: string, completedCount: number): Promise<void> {
    if (completedCount >= 10) await unlock(userId, AchievementCode.MAINTENANCE_MASTER);
  },

  async checkDocumentMilestones(userId: string, documentCount: number): Promise<void> {
    if (documentCount >= 5) await unlock(userId, AchievementCode.DOCUMENT_ORGANIZER);
  },

  async checkBudgetMilestone(userId: string, expenseCount: number): Promise<void> {
    if (expenseCount >= 10) await unlock(userId, AchievementCode.BUDGET_SAVER);
  },

  async checkWarrantyMilestone(userId: string, trackedWarrantiesCount: number): Promise<void> {
    if (trackedWarrantiesCount >= 3) await unlock(userId, AchievementCode.WARRANTY_GUARDIAN);
  },

  async listForUser(userId: string) {
    return Achievement.find({ user: userId }).sort({ unlockedAt: -1 });
  },
};
