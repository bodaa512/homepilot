import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Test User', email, password: 'StrongPass1' });
  return res.body.data.accessToken as string;
}

async function createHome(token: string, name: string) {
  const res = await request(app).post('/api/homes').set('Authorization', `Bearer ${token}`).send({ name, type: 'apartment' });
  return res.body.data.home._id as string;
}

describe('Expenses & Subscriptions', () => {
  it('records expenses and aggregates monthly/yearly/category analytics', async () => {
    const token = await registerAndLogin('expense1@example.com');
    const homeId = await createHome(token, 'Home A');

    await request(app)
      .post(`/api/homes/${homeId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, category: 'electricity', date: new Date().toISOString() });

    await request(app)
      .post(`/api/homes/${homeId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 300, category: 'water', date: new Date().toISOString() });

    const analytics = await request(app)
      .get(`/api/homes/${homeId}/expenses/analytics`)
      .set('Authorization', `Bearer ${token}`);

    expect(analytics.status).toBe(200);
    expect(analytics.body.data.totalThisMonth).toBe(800);
    expect(analytics.body.data.totalThisYear).toBe(800);
    expect(analytics.body.data.byCategory).toHaveLength(2);
  });

  it('creates subscriptions and computes total annual cost across monthly + yearly billing', async () => {
    const token = await registerAndLogin('sub1@example.com');
    const homeId = await createHome(token, 'Home B');

    await request(app)
      .post(`/api/homes/${homeId}/subscriptions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Internet', price: 450, billingFrequency: 'monthly', nextBillingDate: new Date().toISOString() });

    await request(app)
      .post(`/api/homes/${homeId}/subscriptions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Home insurance', price: 2000, billingFrequency: 'yearly', nextBillingDate: new Date().toISOString() });

    const list = await request(app)
      .get(`/api/homes/${homeId}/subscriptions`)
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.subscriptions).toHaveLength(2);
    // 450 * 12 (monthly annualized) + 2000 (already yearly) = 7400
    expect(list.body.data.totalAnnualCost).toBe(7400);
  });

  it('a VIEWER cannot record an expense', async () => {
    const ownerToken = await registerAndLogin('expowner@example.com');
    const viewerToken = await registerAndLogin('expviewer@example.com');
    const homeId = await createHome(ownerToken, 'Shared Home');

    await request(app)
      .post(`/api/homes/${homeId}/members/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'expviewer@example.com', role: 'VIEWER' });

    const res = await request(app)
      .post(`/api/homes/${homeId}/expenses`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 100, category: 'water', date: new Date().toISOString() });

    expect(res.status).toBe(403);
  });
});
