import { Router } from 'express';
import {
  register,
  login,
  googleSignIn,
  refreshToken,
  logout,
  logoutFromAllDevices,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updatePassword,
  getActiveSessions,
  revokeSession,
} from './auth.controller';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { authRateLimiter, passwordResetRateLimiter } from '../../middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  revokeSessionParamsSchema,
} from './auth.validation';

const router = Router();

// Public auth endpoints
router.post('/register', authRateLimiter, validate({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
router.post('/google', authRateLimiter, validate({ body: googleAuthSchema }), googleSignIn);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), refreshToken);
router.post('/logout', logout);
router.post('/verify-email', validate({ body: verifyEmailSchema }), verifyEmail);
router.post('/forgot-password', passwordResetRateLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, validate({ body: resetPasswordSchema }), resetPassword);

// Authenticated auth endpoints
router.get('/me', authenticate, getCurrentUser);
router.post('/logout-all', authenticate, logoutFromAllDevices);
router.post('/update-password', authenticate, validate({ body: updatePasswordSchema }), updatePassword);
router.get('/sessions', authenticate, getActiveSessions);
router.delete('/sessions/:id', authenticate, validate({ params: revokeSessionParamsSchema }), revokeSession);

export default router;
