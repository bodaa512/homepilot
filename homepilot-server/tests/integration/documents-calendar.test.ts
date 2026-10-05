import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
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

function makeTempPdf(): string {
  const filePath = path.join(os.tmpdir(), `test-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, '%PDF-1.4 test file content');
  return filePath;
}

describe('Documents', () => {
  it('uploads, lists, downloads, and deletes a document', async () => {
    const token = await registerAndLogin('docuser@example.com');
    const homeId = await createHome(token, 'Home Docs');
    const filePath = makeTempPdf();

    const uploadRes = await request(app)
      .post(`/api/homes/${homeId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'warranty')
      .attach('file', filePath);

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.document.originalName).toMatch(/\.pdf$/);
    const documentId = uploadRes.body.data.document._id;

    const listRes = await request(app)
      .get(`/api/homes/${homeId}/documents`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data.documents).toHaveLength(1);

    const downloadRes = await request(app)
      .get(`/api/documents/${documentId}/download`)
      .set('Authorization', `Bearer ${token}`);
    expect(downloadRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    fs.unlinkSync(filePath);
  });

  it('rejects a disallowed file type', async () => {
    const token = await registerAndLogin('docuser2@example.com');
    const homeId = await createHome(token, 'Home Docs 2');
    const filePath = path.join(os.tmpdir(), `test-${Date.now()}.exe`);
    fs.writeFileSync(filePath, 'not a real exe, just bytes');

    const res = await request(app)
      .post(`/api/homes/${homeId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', filePath);

    expect(res.status).toBe(400);
    fs.unlinkSync(filePath);
  });

  it('blocks a non-member from downloading a document', async () => {
    const ownerToken = await registerAndLogin('docowner@example.com');
    const strangerToken = await registerAndLogin('docstranger@example.com');
    const homeId = await createHome(ownerToken, 'Private Docs Home');
    const filePath = makeTempPdf();

    const uploadRes = await request(app)
      .post(`/api/homes/${homeId}/documents`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', filePath);
    const documentId = uploadRes.body.data.document._id;

    const res = await request(app)
      .get(`/api/documents/${documentId}/download`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);

    fs.unlinkSync(filePath);
  });
});

describe('Calendar', () => {
  it('aggregates maintenance, subscription renewals, and warranty expirations', async () => {
    const token = await registerAndLogin('caluser@example.com');
    const homeId = await createHome(token, 'Calendar Home');

    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    await request(app)
      .post(`/api/homes/${homeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Check filters', dueDate: soon });

    await request(app)
      .post(`/api/homes/${homeId}/subscriptions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Internet', price: 300, billingFrequency: 'monthly', nextBillingDate: soon });

    const res = await request(app)
      .get(`/api/homes/${homeId}/calendar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const types = res.body.data.events.map((e: { type: string }) => e.type);
    expect(types).toContain('maintenance');
    expect(types).toContain('subscription_renewal');
  });
});
