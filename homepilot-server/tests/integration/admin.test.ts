import request from 'supertest';
import { createApp } from '../../src/app';
import { User } from '../../src/models/User';
import { GlobalRole } from '../../src/constants/roles';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Test User', email, password: 'StrongPass1' });
  return res.body.data.accessToken as string;
}

describe('Admin', () => {
  it('blocks a regular user from every admin endpoint', async () => {
    const token = await registerAndLogin('regular@example.com');

    const users = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(users.status).toBe(403);

    const analytics = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${token}`);
    expect(analytics.status).toBe(403);
  });

  it('allows a platform_admin to list users and deactivate one', async () => {
    const adminToken = await registerAndLogin('admin1@example.com');
    await User.findOneAndUpdate({ email: 'admin1@example.com' }, { role: GlobalRole.PLATFORM_ADMIN });

    const targetToken = await registerAndLogin('target@example.com');
    void targetToken;

    const list = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.users.length).toBeGreaterThanOrEqual(2);

    const target = await User.findOne({ email: 'target@example.com' });
    const deactivate = await request(app)
      .patch(`/api/admin/users/${target!._id}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.user.isActive).toBe(false);

    // Deactivated user can no longer log in.
    const loginAttempt = await request(app)
      .post('/api/auth/login')
      .send({ email: 'target@example.com', password: 'StrongPass1' });
    expect(loginAttempt.status).toBe(401);
  });

  it('returns platform analytics with expected shape', async () => {
    const adminToken = await registerAndLogin('admin2@example.com');
    await User.findOneAndUpdate({ email: 'admin2@example.com' }, { role: GlobalRole.PLATFORM_ADMIN });

    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalHomes');
    expect(res.body.data).toHaveProperty('usersByPlan');
  });
});
