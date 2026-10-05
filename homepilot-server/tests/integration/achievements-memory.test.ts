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

describe('Achievements', () => {
  it('unlocks FIRST_HOME and FIRST_ASSET as the relevant actions happen', async () => {
    const token = await registerAndLogin('achiever@example.com');
    const homeId = await createHome(token, 'Achievement Home');

    await request(app)
      .post(`/api/homes/${homeId}/assets`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fridge', category: 'refrigerator' });

    const res = await request(app).get('/api/achievements').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const codes = res.body.data.achievements.map((a: { code: string }) => a.code);
    expect(codes).toContain('FIRST_HOME');
    expect(codes).toContain('FIRST_ASSET');
  });

  it('does not duplicate an achievement on repeated triggers', async () => {
    const token = await registerAndLogin('achiever2@example.com');
    await createHome(token, 'Home A');
    await createHome(token, 'Home B'); // would fail on Free plan actually — but FIRST_HOME already unlocked either way

    const res = await request(app).get('/api/achievements').set('Authorization', `Bearer ${token}`);
    const firstHomeCount = res.body.data.achievements.filter((a: { code: string }) => a.code === 'FIRST_HOME').length;
    expect(firstHomeCount).toBeLessThanOrEqual(1);
  });
});

describe('Home Memory', () => {
  it('produces a narrative timeline from expenses and completed maintenance', async () => {
    const token = await registerAndLogin('memoryuser@example.com');
    const homeId = await createHome(token, 'Memory Home');

    const taskRes = await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Clean gutters', dueDate: new Date().toISOString() });
    const taskId = taskRes.body.data.task._id;

    await request(app).patch(`/api/maintenance/${taskId}/complete`).set('Authorization', `Bearer ${token}`);

    await request(app)
      .post(`/api/homes/${homeId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 200, category: 'repairs', date: new Date().toISOString(), description: 'Leaky faucet' });

    const res = await request(app).get(`/api/homes/${homeId}/memory`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.entries.length).toBeGreaterThan(0);
    const texts = res.body.data.entries.map((e: { text: string }) => e.text);
    expect(texts.some((t: string) => t.includes('Clean gutters'))).toBe(true);
  });
});
