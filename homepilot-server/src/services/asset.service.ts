import { Asset, IAsset } from '../models/Asset';
import { Room } from '../models/Room';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { AchievementService } from './achievement.service';

export const AssetService = {
  async listAssets(userId: string, homeId: string, filters: { room?: string } = {}) {
    await assertHomeAccess(userId, homeId);
    const query: Record<string, unknown> = { home: homeId };
    if (filters.room) query['room'] = filters.room;
    return Asset.find(query).populate('room', 'name').sort({ createdAt: -1 });
  },

  async getAsset(userId: string, assetId: string) {
    const asset = await Asset.findById(assetId).populate('room', 'name');
    if (!asset) throw new NotFoundError('Asset not found');
    await assertHomeAccess(userId, asset.home.toString());
    return asset;
  },

  async createAsset(
    userId: string,
    homeId: string,
    input: Pick<IAsset, 'category' | 'name'> & Partial<IAsset>,
  ) {
    await assertHomeAccess(userId, homeId, 'assets:manage');

    if (input.room) {
      const room = await Room.findOne({ _id: input.room, home: homeId });
      if (!room) throw new ValidationError('Selected room does not belong to this home');
    }

    if (
      input.warrantyStart &&
      input.warrantyExpiration &&
      input.warrantyExpiration < input.warrantyStart
    ) {
      throw new ValidationError('Warranty expiration cannot be before the warranty start date');
    }

    const asset = await Asset.create({ ...input, home: homeId, createdBy: userId });

    const assetCount = await Asset.countDocuments({ home: homeId });
    await AchievementService.checkFirstAsset(userId, assetCount);

    if (asset.warrantyExpiration) {
      const warrantyCount = await Asset.countDocuments({ home: homeId, warrantyExpiration: { $exists: true } });
      await AchievementService.checkWarrantyMilestone(userId, warrantyCount);
    }

    return asset;
  },

  async updateAsset(userId: string, assetId: string, updates: Partial<IAsset>) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    await assertHomeAccess(userId, asset.home.toString(), 'assets:manage');

    if (updates.room) {
      const room = await Room.findOne({ _id: updates.room, home: asset.home });
      if (!room) throw new ValidationError('Selected room does not belong to this home');
    }

    Object.assign(asset, updates);
    await asset.save();
    return asset;
  },

  async deleteAsset(userId: string, assetId: string) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    await assertHomeAccess(userId, asset.home.toString(), 'assets:manage');
    await asset.deleteOne();
  },
};
