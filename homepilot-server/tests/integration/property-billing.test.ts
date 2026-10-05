import request from 'supertest';
import { createApp } from '../../src/app';
import { seedPlans } from '../../src/jobs/seedPlans';

const app = createApp();

beforeAll(async () => {
  await seedPlans();
});

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Test User', email, password: 'StrongPass1' });
  return res.body.data.accessToken as string;
}

describe('Plans & billing limits', () => {
  it('lists the seeded plans publicly', async () => {
    const res = await request(app).get('/api/payments/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.plans.map((p: { code: string }) => p.code).sort()).toEqual([
      'free',
      'premium',
      'property_pro',
    ]);
  });

  it('blocks a Free-plan user from creating a second home', async () => {
    const token = await registerAndLogin('freeuser@example.com');

    const first = await request(app).post('/api/homes').set('Authorization', `Bearer ${token}`).send({
      name: 'Home 1',
      type: 'apartment',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/homes').set('Authorization', `Bearer ${token}`).send({
      name: 'Home 2',
      type: 'apartment',
    });
    expect(second.status).toBe(400);
    expect(second.body.message).toContain('Free');
  });
});

describe('Property management', () => {
  it('creates a property, adds a unit, and assigns a tenant with home access', async () => {
    const managerToken = await registerAndLogin('manager1@example.com');
    const tenantToken = await registerAndLogin('tenant1@example.com');

    const propertyRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Nile Towers', city: 'Cairo' });
    expect(propertyRes.status).toBe(201);
    const propertyId = propertyRes.body.data.property._id;

    const unitRes = await request(app)
      .post(`/api/properties/${propertyId}/units`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ unitNumber: '4B' });
    expect(unitRes.status).toBe(201);
    const unit = unitRes.body.data.unit;
    expect(unit.status).toBe('vacant');

    const assignRes = await request(app)
      .post(`/api/properties/units/${unit._id}/tenant`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ email: 'tenant1@example.com', rentAmount: 5000 });
    expect(assignRes.status).toBe(201);

    // Tenant can now read the unit's underlying Home (granted MEMBER access).
    const homeView = await request(app)
      .get(`/api/homes/${unit.home}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(homeView.status).toBe(200);

    // And can create a service request (maintenance issue report) as a MEMBER.
    const reportIssue = await request(app)
      .post(`/api/homes/${unit.home}/service-requests`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ category: 'plumbing', title: 'Leaking tap' });
    expect(reportIssue.status).toBe(201);
  });

  it('prevents a non-manager from adding units to someone else\'s property', async () => {
    const managerToken = await registerAndLogin('manager2@example.com');
    const strangerToken = await registerAndLogin('stranger3@example.com');

    const propertyRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Delta Heights' });
    const propertyId = propertyRes.body.data.property._id;

    const res = await request(app)
      .post(`/api/properties/${propertyId}/units`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ unitNumber: '1A' });
    expect(res.status).toBe(403);
  });
});
