import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Test User', email, password: 'StrongPass1' });
  return res.body.data.accessToken as string;
}

describe('Home / Room / Asset', () => {
  it('creates a home and auto-assigns the creator as OWNER', async () => {
    const token = await registerAndLogin('owner1@example.com');
    const res = await request(app)
      .post('/api/homes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Cairo Apartment', type: 'apartment' });

    expect(res.status).toBe(201);
    expect(res.body.data.home.name).toBe('My Cairo Apartment');

    const list = await request(app).get('/api/homes').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.homes).toHaveLength(1);
    expect(list.body.data.homes[0].role).toBe('OWNER');
  });

  it('creates a room and an asset inside a home', async () => {
    const token = await registerAndLogin('owner2@example.com');
    const homeRes = await request(app)
      .post('/api/homes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Family House', type: 'house' });
    const homeId = homeRes.body.data.home._id;

    const roomRes = await request(app)
      .post(`/api/homes/${homeId}/rooms`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kitchen' });
    expect(roomRes.status).toBe(201);
    const roomId = roomRes.body.data.room._id;

    const assetRes = await request(app)
      .post(`/api/homes/${homeId}/assets`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Samsung Refrigerator', category: 'refrigerator', room: roomId });
    expect(assetRes.status).toBe(201);
    expect(assetRes.body.data.asset.condition).toBe('NEW');

    const listAssets = await request(app)
      .get(`/api/homes/${homeId}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(listAssets.body.data.assets).toHaveLength(1);
  });

  it("blocks a user from reading another user's home by guessing its ID", async () => {
    const ownerToken = await registerAndLogin('owner3@example.com');
    const strangerToken = await registerAndLogin('stranger@example.com');

    const homeRes = await request(app)
      .post('/api/homes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Private Villa', type: 'villa' });
    const homeId = homeRes.body.data.home._id;

    const res = await request(app).get(`/api/homes/${homeId}`).set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(404); // deliberately not 403 — see authorization.service.ts

    const createAsset = await request(app)
      .post(`/api/homes/${homeId}/assets`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ name: 'Fake AC', category: 'air_conditioner' });
    expect(createAsset.status).toBe(404);
  });

  it('a VIEWER member can read but not create assets', async () => {
    const ownerToken = await registerAndLogin('owner4@example.com');
    const viewerToken = await registerAndLogin('viewer4@example.com');

    const homeRes = await request(app)
      .post('/api/homes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Shared Home', type: 'apartment' });
    const homeId = homeRes.body.data.home._id;

    const invite = await request(app)
      .post(`/api/homes/${homeId}/members/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'viewer4@example.com', role: 'VIEWER' });
    expect(invite.status).toBe(201);

    const readHome = await request(app).get(`/api/homes/${homeId}`).set('Authorization', `Bearer ${viewerToken}`);
    expect(readHome.status).toBe(200);

    const createAsset = await request(app)
      .post(`/api/homes/${homeId}/assets`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'AC', category: 'air_conditioner' });
    expect(createAsset.status).toBe(403);
  });
});
