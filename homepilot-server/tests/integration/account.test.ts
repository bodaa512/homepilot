import request from 'supertest';
import { createApp } from '../../src/app';
import { User } from '../../src/models/User';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';
import * as emailUtil from '../../src/utils/email';

const app = createApp();

const PASSWORD = 'StrongPass1';

/**
 * Creates a user straight through the model (and signs a token for them) so
 * these tests don't burn the auth rate-limit budget on registration.
 */
async function createUser(email = 'sara@example.com') {
  const user = await User.create({
    fullName: 'Sara Account',
    email,
    passwordHash: await hashPassword(PASSWORD),
  });
  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { user, token };
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** "refreshToken=abc..." — the name=value part of the Set-Cookie header. */
function refreshCookieFrom(res: request.Response): string {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = raw.find((c) => c.startsWith('refreshToken='));
  if (!cookie) throw new Error('response did not set a refreshToken cookie');
  return cookie.split(';')[0];
}

/** In dev mode (no SMTP) emails are printed to the console — pull the emailed token back out. */
function emailedToken(logSpy: jest.SpyInstance, path: 'verify-email' | 'reset-password'): string {
  const call = [...logSpy.mock.calls]
    .reverse()
    .find((args) => typeof args[0] === 'string' && args[0].includes(`${path}?token=`));
  const match = call?.[0].match(/token=([a-f0-9]+)/);
  if (!match) throw new Error(`no ${path} link was emailed`);
  return match[1];
}

describe('Account: profile', () => {
  it('returns the fields the account page needs (phone, plan, email status)', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/auth/me').set(bearer(token));

    expect(res.status).toBe(200);
    const { user } = res.body.data;
    expect(user.planCode).toBe('free');
    expect(user.isEmailVerified).toBe(false);
    expect(user._id).toBeDefined();
    expect(user._id).toBe(user.id);
    expect(user.passwordHash).toBeUndefined();
  });

  it('updates the name and phone and persists them', async () => {
    const { token } = await createUser();

    const res = await request(app)
      .patch('/api/auth/me')
      .set(bearer(token))
      .send({ fullName: '  Sara Mostafa  ', phone: ' 01012345678 ' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe('Sara Mostafa');
    expect(res.body.data.user.phone).toBe('01012345678');

    const me = await request(app).get('/api/auth/me').set(bearer(token));
    expect(me.body.data.user.fullName).toBe('Sara Mostafa');
    expect(me.body.data.user.phone).toBe('01012345678');
  });

  it('can update just one of the two fields', async () => {
    const { token } = await createUser();
    await request(app).patch('/api/auth/me').set(bearer(token)).send({ phone: '+20 100 000 0000' });

    const res = await request(app).patch('/api/auth/me').set(bearer(token)).send({ fullName: 'Only Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe('Only Name');
    expect(res.body.data.user.phone).toBe('+20 100 000 0000'); // untouched
  });

  it('clears the phone when an empty string is sent', async () => {
    const { token } = await createUser();
    await request(app).patch('/api/auth/me').set(bearer(token)).send({ phone: '01012345678' });

    const res = await request(app).patch('/api/auth/me').set(bearer(token)).send({ phone: '' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBeUndefined();
  });

  it('rejects an empty update, a too-short name and a phone with letters', async () => {
    const { token } = await createUser();

    const empty = await request(app).patch('/api/auth/me').set(bearer(token)).send({});
    expect(empty.status).toBe(400);

    const shortName = await request(app).patch('/api/auth/me').set(bearer(token)).send({ fullName: 'A' });
    expect(shortName.status).toBe(400);

    const badPhone = await request(app).patch('/api/auth/me').set(bearer(token)).send({ phone: 'call-me-maybe' });
    expect(badPhone.status).toBe(400);
  });

  it('never lets the caller change email, role, plan or verification status', async () => {
    const { token } = await createUser('safe@example.com');

    const res = await request(app).patch('/api/auth/me').set(bearer(token)).send({
      fullName: 'Still Sara',
      email: 'hacker@example.com',
      role: 'platform_admin',
      planCode: 'property_pro',
      isEmailVerified: true,
    });

    expect(res.status).toBe(200);
    const { user } = res.body.data;
    expect(user.fullName).toBe('Still Sara');
    expect(user.email).toBe('safe@example.com');
    expect(user.role).toBe('owner');
    expect(user.planCode).toBe('free');
    expect(user.isEmailVerified).toBe(false);
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/me').send({ fullName: 'Nobody' });
    expect(res.status).toBe(401);
  });
});

describe('Account: change password', () => {
  it('changes the password, keeps this session alive and revokes the old refresh token', async () => {
    await createUser('pw@example.com');

    const login = await request(app).post('/api/auth/login').send({ email: 'pw@example.com', password: PASSWORD });
    expect(login.status).toBe(200);
    const oldCookie = refreshCookieFrom(login);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set(bearer(login.body.data.accessToken))
      .send({ currentPassword: PASSWORD, newPassword: 'BrandNew123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const newCookie = refreshCookieFrom(res);

    // The device that changed the password stays signed in...
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', newCookie);
    expect(refreshed.status).toBe(200);

    // ...while any refresh token from before the change is dead.
    const stale = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(stale.status).toBe(401);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'pw@example.com', password: PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'pw@example.com', password: 'BrandNew123' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a wrong current password and a weak new one', async () => {
    const { token } = await createUser();

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(bearer(token))
      .send({ currentPassword: 'NotMyPassword1', newPassword: 'BrandNew123' });
    // 400 (not 401): the user is signed in, only the confirmation is wrong.
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('Current password is incorrect');

    const weak = await request(app)
      .post('/api/auth/change-password')
      .set(bearer(token))
      .send({ currentPassword: PASSWORD, newPassword: 'weak' });
    expect(weak.status).toBe(400);
  });
});

// NOTE: POST /auth/resend-verification is rate-limited to 5 per 15 min per IP, and the limiter
// lives for the whole test file — this describe block uses all 5 allowed resend calls,
// so any new test that resends needs the limiter budget raised first.
describe('Account: email verification & password reset links', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('resends a working verification link, then reports already-verified', async () => {
    const { token } = await createUser();

    const resend = await request(app).post('/api/auth/resend-verification').set(bearer(token));
    expect(resend.status).toBe(200);
    expect(resend.body.data.alreadyVerified).toBe(false);

    const verify = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: emailedToken(logSpy, 'verify-email') });
    expect(verify.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set(bearer(token));
    expect(me.body.data.user.isEmailVerified).toBe(true);

    const again = await request(app).post('/api/auth/resend-verification').set(bearer(token));
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyVerified).toBe(true);
  });

  it('only the newest verification link works after a resend', async () => {
    const { token } = await createUser();

    await request(app).post('/api/auth/resend-verification').set(bearer(token));
    const first = emailedToken(logSpy, 'verify-email');
    await request(app).post('/api/auth/resend-verification').set(bearer(token));
    const second = emailedToken(logSpy, 'verify-email');
    expect(second).not.toBe(first);

    const stale = await request(app).post('/api/auth/verify-email').send({ token: first });
    expect(stale.status).toBe(400);
    const fresh = await request(app).post('/api/auth/verify-email').send({ token: second });
    expect(fresh.status).toBe(200);
  });

  it('requires authentication to resend', async () => {
    const res = await request(app).post('/api/auth/resend-verification');
    expect(res.status).toBe(401);
  });

  it('resets a forgotten password through the emailed link', async () => {
    await createUser('forgot@example.com');

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'forgot@example.com' });
    expect(forgot.status).toBe(200);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: emailedToken(logSpy, 'reset-password'), newPassword: 'ResetMe12345' });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: 'forgot@example.com', password: 'ResetMe12345' });
    expect(login.status).toBe(200);
  });

  it('does not reveal whether an email has an account', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
  });

  it('forgot-password still answers 200 (and does not leak accounts) when the SMTP server is down', async () => {
    await createUser('smtp-down@example.com');
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const sendSpy = jest.spyOn(emailUtil, 'sendPasswordResetEmail').mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'smtp-down@example.com' });

    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalled();
    sendSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('resend-verification reports a clear 502 when the SMTP server is down', async () => {
    const { token } = await createUser('smtp-down2@example.com');
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const sendSpy = jest.spyOn(emailUtil, 'sendVerificationEmail').mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).post('/api/auth/resend-verification').set(bearer(token));

    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/could not send the email/i);
    sendSpy.mockRestore();
    errSpy.mockRestore();
  });
});
