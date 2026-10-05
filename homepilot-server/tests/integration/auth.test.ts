import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

const validUser = {
  fullName: 'Ahmed Test',
  email: 'ahmed@example.com',
  password: 'StrongPass1',
};

describe('Auth flow', () => {
  it('registers a new user and returns an access token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'weak@example.com', password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const good = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toBeDefined();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPass1' });
    expect(bad.status).toBe(401);
  });

  it('blocks /me without a token and allows it with a valid one', async () => {
    const noAuth = await request(app).get('/api/auth/me');
    expect(noAuth.status).toBe(401);

    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const token = registerRes.body.data.accessToken;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(validUser.email);
  });
});
