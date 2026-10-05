import { Home, IHome } from '../models/Home';
import { HomeMembership } from '../models/HomeMembership';
import { User } from '../models/User';
import { Plan } from '../models/Plan';
import { HomeRole } from '../constants/roles';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { Room } from '../models/Room';
import { Asset } from '../models/Asset';
import { AuditLogService } from './auditLog.service';
import { AchievementService } from './achievement.service';

type CreateHomeInput = Pick<IHome, 'name' | 'type'> & Partial<IHome>;

export const HomeService = {
  async createHome(userId: string, input: CreateHomeInput) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const plan = await Plan.findOne({ code: user.planCode });
    if (plan && plan.limits.homes !== -1) {
      const ownedHomesCount = await HomeMembership.countDocuments({
        user: userId,
        role: HomeRole.OWNER,
        status: 'active',
      });
      if (ownedHomesCount >= plan.limits.homes) {
        throw new ValidationError(
          `باقة ${plan.name} الحالية تسمح بـ ${plan.limits.homes} منزل فقط — قم بالترقية لإضافة المزيد`,
        );
      }
    }

    const home = await Home.create({ ...input, createdBy: userId });
    await HomeMembership.create({ home: home._id, user: userId, role: HomeRole.OWNER, status: 'active' });

    const ownedHomesCountAfter = await HomeMembership.countDocuments({
      user: userId,
      role: HomeRole.OWNER,
      status: 'active',
    });
    await AchievementService.checkFirstHome(userId, ownedHomesCountAfter);
    return home;
  },

  async listMyHomes(userId: string) {
    const memberships = await HomeMembership.find({ user: userId, status: 'active' }).populate('home');
    return memberships
      .filter((m) => m.home) // guard against a dangling membership if a home was hard-deleted
      .map((m) => ({ home: m.home, role: m.role }));
  },

  async getHome(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    const home = await Home.findById(homeId);
    if (!home || !home.isActive) throw new NotFoundError('Home not found');
    return home;
  },

  async updateHome(userId: string, homeId: string, updates: Partial<IHome>) {
    await assertHomeAccess(userId, homeId, 'home:update');
    // Whitelist: the validator doesn't strip unknown keys, so without this an owner could
    // overwrite createdBy / isActive / images straight through the request body.
    const allowed: (keyof IHome)[] = [
      'name', 'type', 'address', 'city', 'country', 'ownershipType', 'numberOfRooms', 'numberOfResidents', 'notes',
    ];
    const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key as keyof IHome)));
    const home = await Home.findByIdAndUpdate(homeId, safeUpdates, { new: true, runValidators: true });
    if (!home) throw new NotFoundError('Home not found');
    return home;
  },

  async deleteHome(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId, 'home:delete');
    // Soft delete: preserves history (expenses, maintenance, documents) for
    // audit/analytics purposes rather than cascading a hard delete.
    const home = await Home.findByIdAndUpdate(homeId, { isActive: false }, { new: true });
    if (!home) throw new NotFoundError('Home not found');
    await AuditLogService.log({ actor: userId, action: 'home.delete', entityType: 'Home', entityId: homeId });
    return home;
  },

  async listMembers(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    return HomeMembership.find({ home: homeId, status: 'active' }).populate('user', 'fullName email avatarUrl');
  },

  async inviteMember(userId: string, homeId: string, email: string, role: HomeRole) {
    await assertHomeAccess(userId, homeId, 'members:manage');

    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      throw new ValidationError('No HomePilot account exists for this email yet — ask them to register first');
    }

    const existing = await HomeMembership.findOne({ home: homeId, user: invitedUser._id });
    if (existing) {
      throw new ValidationError('This person is already a member of this home');
    }

    const membership = await HomeMembership.create({
      home: homeId,
      user: invitedUser._id,
      role,
      invitedBy: userId,
      status: 'active',
    });

    await AuditLogService.log({
      actor: userId,
      action: 'home.member.invite',
      entityType: 'Home',
      entityId: homeId,
      metadata: { invitedUser: invitedUser._id.toString(), role },
    });

    return membership;
  },

  /** Lightweight home-summary counts, used by the dashboard until full analytics land in a later phase. */
  async getHomeSummary(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    const [roomCount, assetCount] = await Promise.all([
      Room.countDocuments({ home: homeId }),
      Asset.countDocuments({ home: homeId }),
    ]);
    return { roomCount, assetCount };
  },
};
