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

describe('Maintenance', () => {
  it('creates a one-time task and completes it', async () => {
    const token = await registerAndLogin('maint1@example.com');
    const homeId = await createHome(token, 'Home A');

    const createRes = await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Clean AC filter', dueDate: new Date(Date.now() + 86400000).toISOString() });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.task.status).toBe('PENDING');

    const taskId = createRes.body.data.task._id;
    const completeRes = await request(app)
      .patch(`/api/maintenance/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.task.status).toBe('COMPLETED');
  });

  it('spawns the next occurrence when a recurring task is completed', async () => {
    const token = await registerAndLogin('maint2@example.com');
    const homeId = await createHome(token, 'Home B');

    const createRes = await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Clean drum',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        recurrenceIntervalDays: 60,
      });
    const taskId = createRes.body.data.task._id;

    await request(app).patch(`/api/maintenance/${taskId}/complete`).set('Authorization', `Bearer ${token}`);

    const list = await request(app)
      .get(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.tasks).toHaveLength(2);
    const pending = list.body.data.tasks.find((t: { status: string }) => t.status === 'PENDING');
    expect(pending).toBeDefined();
  });

  it('a MEMBER can complete a task but not create one', async () => {
    const ownerToken = await registerAndLogin('maintowner@example.com');
    const memberToken = await registerAndLogin('maintmember@example.com');
    const homeId = await createHome(ownerToken, 'Shared Home');

    await request(app)
      .post(`/api/homes/${homeId}/members/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'maintmember@example.com', role: 'MEMBER' });

    const createAsMember = await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Should fail', dueDate: new Date().toISOString() });
    expect(createAsMember.status).toBe(403);

    const createAsOwner = await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Owner task', dueDate: new Date().toISOString() });
    const taskId = createAsOwner.body.data.task._id;

    const completeAsMember = await request(app)
      .patch(`/api/maintenance/${taskId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(completeAsMember.status).toBe(200);
  });
});
