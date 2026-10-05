import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';
import { AuthenticationError } from '../errors/specificErrors';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',
  });
}

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Account created successfully', 201);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Logged in successfully');
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
    if (!token) {
      throw new AuthenticationError('Refresh token missing');
    }
    const result = await AuthService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Token refreshed');
  }),

  logout: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user) {
      await AuthService.logout(req.user.id);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    sendSuccess(res, null, 'Logged out successfully');
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const user = await AuthService.verifyEmail(req.body.token);
    sendSuccess(res, { user }, 'Email verified successfully');
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await AuthService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await AuthService.resetPassword(req.body.token, req.body.newPassword);
    sendSuccess(res, null, 'Password reset successfully');
  }),

  changePassword: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const result = await AuthService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    // Every other session was just revoked; keep this one alive with fresh tokens.
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Password changed successfully');
  }),

  updateProfile: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const user = await AuthService.updateProfile(req.user.id, req.body);
    sendSuccess(res, { user }, 'Profile updated successfully');
  }),

  resendVerification: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const { alreadyVerified } = await AuthService.resendVerification(req.user.id);
    sendSuccess(
      res,
      { alreadyVerified },
      alreadyVerified ? 'Email is already verified' : 'Verification email sent',
    );
  }),

  me: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const user = await AuthService.getProfile(req.user.id);
    sendSuccess(res, { user });
  }),
};
