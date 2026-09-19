import { Router } from 'express';
import { register, login, checkUsername } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-username', checkUsername);

export default router;