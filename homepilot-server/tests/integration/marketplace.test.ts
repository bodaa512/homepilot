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

describe('Service marketplace', () => {
  it('runs the full lifecycle: request → offer → accept → complete → review', async () => {
    const customerToken = await registerAndLogin('customer1@example.com');
    const providerToken = await registerAndLogin('provider1@example.com');
    const homeId = await createHome(customerToken, 'Home A');

    // Provider creates a profile
    const providerProfile = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ businessName: 'Cairo AC Repairs', categories: ['ac'], serviceAreas: ['Cairo'] });
    expect(providerProfile.status).toBe(200);

    // Customer creates a service request
    const requestRes = await request(app)
      .post(`/api/homes/${homeId}/service-requests`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ category: 'ac', title: 'AC not cooling', urgency: 'high' });
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data.request._id;
    expect(requestRes.body.data.request.status).toBe('REQUESTED');

    // Provider sees it in their open requests feed
    const openRequests = await request(app)
      .get('/api/providers/requests/open')
      .set('Authorization', `Bearer ${providerToken}`);
    expect(openRequests.body.data.requests.some((r: { _id: string }) => r._id === requestId)).toBe(true);

    // Provider submits an offer
    const offerRes = await request(app)
      .post(`/api/service-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ price: 500, estimatedDurationHours: 2 });
    expect(offerRes.status).toBe(201);
    const offerId = offerRes.body.data.offer._id;

    // Request status flips to OFFERS_RECEIVED
    const afterOffer = await request(app)
      .get(`/api/service-requests/${requestId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(afterOffer.body.data.request.status).toBe('OFFERS_RECEIVED');

    // Customer accepts the offer
    const acceptRes = await request(app)
      .patch(`/api/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.request.status).toBe('SCHEDULED');
    const appointmentId = acceptRes.body.data.appointment._id;

    // Provider marks the appointment completed
    const completeRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeRes.status).toBe(200);

    // Customer leaves a review
    const reviewRes = await request(app)
      .post(`/api/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ratingOverall: 5, comment: 'Fast and professional' });
    expect(reviewRes.status).toBe(201);

    const finalRequest = await request(app)
      .get(`/api/service-requests/${requestId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(finalRequest.body.data.request.status).toBe('REVIEWED');
  });

  it('prevents a stranger from viewing a service request or its chat thread', async () => {
    const customerToken = await registerAndLogin('customer2@example.com');
    const providerToken = await registerAndLogin('provider2@example.com');
    const strangerToken = await registerAndLogin('stranger2@example.com');
    const homeId = await createHome(customerToken, 'Home B');

    const providerProfile = await request(app)
      .post('/api/providers')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ businessName: 'Plumb Co', categories: ['plumbing'], serviceAreas: ['Giza'] });
    const providerId = providerProfile.body.data.provider._id;

    const requestRes = await request(app)
      .post(`/api/homes/${homeId}/service-requests`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ category: 'plumbing', title: 'Leaking pipe' });
    const requestId = requestRes.body.data.request._id;

    const strangerView = await request(app)
      .get(`/api/service-requests/${requestId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(strangerView.status).toBe(404);

    await request(app)
      .post(`/api/service-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ price: 300 });

    const strangerChat = await request(app)
      .post(`/api/service-requests/${requestId}/providers/${providerId}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ text: 'hello' });
    expect(strangerChat.status).toBe(403);

    const customerChat = await request(app)
      .post(`/api/service-requests/${requestId}/providers/${providerId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'When can you come?' });
    expect(customerChat.status).toBe(201);

    const providerReply = await request(app)
      .post(`/api/service-requests/${requestId}/providers/${providerId}/messages`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ text: 'Tomorrow morning works.' });
    expect(providerReply.status).toBe(201);

    const messages = await request(app)
      .get(`/api/service-requests/${requestId}/providers/${providerId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(messages.body.data.messages).toHaveLength(2);
  });
});
