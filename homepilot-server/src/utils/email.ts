import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: env.email.user ? { user: env.email.user, pass: env.email.password } : undefined,
  // Without these a wrong host/port hangs the HTTP request for minutes instead of failing fast.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

if (!env.email.host && env.nodeEnv !== 'test') {
  // eslint-disable-next-line no-console
  console.warn(
    '[email] EMAIL_HOST is empty, so NO emails are sent. Verification / password-reset links are printed in this console instead. Set EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD in .env to send real emails.',
  );
}

/**
 * Sends an email without ever throwing. Used where a mail failure must not break
 * the request (sign-up, forgot-password) — and for forgot-password it also avoids
 * leaking which addresses have an account (a 500 only for real accounts would).
 * Returns whether the mail was handed to the SMTP server (or dev-logged).
 */
export async function trySend(send: () => Promise<void>, what: string): Promise<boolean> {
  try {
    await send();
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[email] failed to send ${what}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!env.email.host) {
    // In local dev without SMTP configured, don't crash the request flow —
    // just log so the token/link is still visible for manual testing.
    // eslint-disable-next-line no-console
    console.log(`[email:dev-mode] to=${to} subject="${subject}"\n${html}`);
    return;
  }
  await transporter.sendMail({ from: env.email.from, to, subject, html });
}

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  await sendMail(
    to,
    'Welcome to HomePilot',
    `<p>Hi ${fullName},</p><p>Welcome to HomePilot — your home's new digital operating system.</p>`,
  );
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await sendMail(
    to,
    'Verify your HomePilot email',
    `<p>Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail(
    to,
    'Reset your HomePilot password',
    `<p>Reset your password using the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  );
}
