import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { hashPassword, comparePassword, generateSecureToken, hashToken } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/specificErrors';
import { AppError } from '../errors/AppError';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail, trySend } from '../utils/email';
import { GlobalRole } from '../constants/roles';
import { RegisterInput, LoginInput, UpdateProfileInput } from '../validators/auth.validators';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: IUser): AuthTokens {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.refreshTokenVersion,
  });
  return { accessToken, refreshToken };
}

/**
 * The shape the web client's `AuthUser` model expects (see core/models/auth.model.ts).
 * `_id` is sent alongside `id` because the client reads `_id` (like every other
 * Mongo-backed model it receives); `planCode`/`phone`/`locale` used to be missing
 * entirely, which is why the account page and billing screen always showed "free".
 */
function toPublicUser(user: IUser) {
  const id = user._id.toString();
  return {
    id,
    _id: id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    locale: user.locale,
    planCode: user.planCode,
    planRenewsAt: user.planRenewsAt,
    createdAt: user.createdAt,
  };
}

export const AuthService = {
  async register(input: RegisterInput) {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const { rawToken, hashedToken } = generateSecureToken();

    const user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role ?? GlobalRole.OWNER,
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });

    const verifyUrl = `${env.clientUrl}/verify-email?token=${rawToken}`;
    // The account already exists at this point — a flaky SMTP server must not turn a
    // successful sign-up into a 500. The user can request the link again from "حسابي".
    await Promise.all([
      trySend(() => sendWelcomeEmail(user.email, user.fullName), 'welcome email'),
      trySend(() => sendVerificationEmail(user.email, verifyUrl), 'verification email'),
    ]);

    const tokens = issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new AuthenticationError('This account has been deactivated');
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    if (payload.tokenType !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError('Account no longer available');
    }

    // Refresh token rotation: a token is only valid if it matches the
    // user's current tokenVersion. Logging out (or a forced revoke) bumps
    // the version, instantly invalidating every previously issued refresh token.
    if (payload.tokenVersion !== user.refreshTokenVersion) {
      throw new AuthenticationError('Refresh token has been revoked');
    }

    const tokens = issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout(userId: string) {
    // Bump refreshTokenVersion so any outstanding refresh tokens for this
    // user become invalid immediately.
    await User.findByIdAndUpdate(userId, { $inc: { refreshTokenVersion: 1 } });
  },

  async verifyEmail(rawToken: string) {
    const hashedToken = hashToken(rawToken);
    const user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpires');

    if (!user) {
      throw new ValidationError('Verification link is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return toPublicUser(user);
  },

  async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    // Intentionally do not reveal whether the email exists — always
    // respond as if the email was sent, to avoid account enumeration.
    if (!user) return;

    const { rawToken, hashedToken } = generateSecureToken();
    user.passwordResetTokenHash = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
    // Never throw here: a failure only for existing accounts would reveal which emails are registered.
    await trySend(() => sendPasswordResetEmail(user.email, resetUrl), 'password-reset email');
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const hashedToken = hashToken(rawToken);
    const user = await User.findOne({
      passwordResetTokenHash: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      throw new ValidationError('Reset link is invalid or has expired');
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenVersion += 1; // revoke all existing sessions
    await user.save();
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      // 400, not 401: the caller IS authenticated — only the confirmation is wrong.
      // (A 401 would make the web client's interceptor treat the session as expired.)
      throw new ValidationError('Current password is incorrect', [
        { field: 'currentPassword', message: 'Current password is incorrect' },
      ]);
    }

    user.passwordHash = await hashPassword(newPassword);
    // Bumping the version revokes every refresh token issued before this moment
    // (other devices included)...
    user.refreshTokenVersion += 1;
    await user.save();

    // ...so the device that made the change must get a fresh pair. Previously
    // nothing was re-issued here, which silently logged the user out as soon as
    // their 15-minute access token expired.
    const tokens = issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Pick fields explicitly — never spread req.body into the document.
    if (input.fullName !== undefined) {
      user.fullName = input.fullName.trim();
    }
    if (input.phone !== undefined) {
      const phone = input.phone.trim();
      user.phone = phone === '' ? undefined : phone;
    }
    await user.save();

    return toPublicUser(user);
  },

  async resendVerification(userId: string) {
    const user = await User.findById(userId).select('+emailVerificationTokenHash +emailVerificationExpires');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.isEmailVerified) {
      return { alreadyVerified: true };
    }

    // A new token replaces the old one, so only the latest link in the inbox works.
    const { rawToken, hashedToken } = generateSecureToken();
    user.emailVerificationTokenHash = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await user.save();

    // The user is signed in and asked for this explicitly, so tell them if it didn't go out.
    const sent = await trySend(
      () => sendVerificationEmail(user.email, `${env.clientUrl}/verify-email?token=${rawToken}`),
      'verification email',
    );
    if (!sent) {
      throw new AppError('We could not send the email right now — please try again in a few minutes', 502);
    }
    return { alreadyVerified: false };
  },

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return toPublicUser(user);
  },
};
