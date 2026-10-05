import { Property } from '../models/Property';
import { PropertyUnit } from '../models/PropertyUnit';
import { Tenant } from '../models/Tenant';
import { Home, HomeType, OwnershipType } from '../models/Home';
import { HomeMembership } from '../models/HomeMembership';
import { User } from '../models/User';
import { HomeRole } from '../constants/roles';
import { NotFoundError, ValidationError, AuthorizationError } from '../errors/specificErrors';

async function assertManagesProperty(userId: string, propertyId: string) {
  const property = await Property.findById(propertyId);
  if (!property) throw new NotFoundError('Property not found');
  if (property.manager.toString() !== userId) {
    throw new AuthorizationError('You do not manage this property');
  }
  return property;
}

export const PropertyService = {
  async createProperty(userId: string, input: { name: string; address?: string; city?: string }) {
    return Property.create({ ...input, manager: userId });
  },

  async listMyProperties(userId: string) {
    const properties = await Property.find({ manager: userId }).sort({ createdAt: -1 });
    const withCounts = await Promise.all(
      properties.map(async (p) => {
        const [totalUnits, occupiedUnits] = await Promise.all([
          PropertyUnit.countDocuments({ property: p._id }),
          PropertyUnit.countDocuments({ property: p._id, status: 'occupied' }),
        ]);
        return { property: p, totalUnits, occupiedUnits };
      }),
    );
    return withCounts;
  },

  async listUnits(userId: string, propertyId: string) {
    await assertManagesProperty(userId, propertyId);
    return PropertyUnit.find({ property: propertyId }).populate('home', 'name');
  },

  async addUnit(userId: string, propertyId: string, unitNumber: string) {
    const property = await assertManagesProperty(userId, propertyId);

    const home = await Home.create({
      name: `${property.name} — وحدة ${unitNumber}`,
      type: HomeType.RENTAL_PROPERTY,
      ownershipType: OwnershipType.RENT,
      city: property.city,
      createdBy: userId,
    });
    await HomeMembership.create({ home: home._id, user: userId, role: HomeRole.OWNER, status: 'active' });

    return PropertyUnit.create({ property: propertyId, home: home._id, unitNumber });
  },

  async assignTenant(
    userId: string,
    unitId: string,
    input: { email: string; leaseStart?: Date; leaseEnd?: Date; rentAmount?: number },
  ) {
    const unit = await PropertyUnit.findById(unitId);
    if (!unit) throw new NotFoundError('Unit not found');
    await assertManagesProperty(userId, unit.property.toString());

    const tenantUser = await User.findOne({ email: input.email });
    if (!tenantUser) {
      throw new ValidationError('No HomePilot account exists for this email yet — ask them to register first');
    }

    const existing = await Tenant.findOne({ unit: unitId });
    if (existing) throw new ValidationError('This unit already has a tenant assigned');

    await HomeMembership.findOneAndUpdate(
      { home: unit.home, user: tenantUser._id },
      { home: unit.home, user: tenantUser._id, role: HomeRole.MEMBER, status: 'active', invitedBy: userId },
      { upsert: true },
    );

    unit.status = 'occupied';
    await unit.save();

    return Tenant.create({ user: tenantUser._id, unit: unitId, ...input });
  },
};
