import { Router } from 'express';
import {
  register,
  login,
  checkUsername,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/check-username', checkUsername);


export default router;