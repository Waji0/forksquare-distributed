import { Router } from 'express';
import { sendTestEmail, getEmailLogs } from '../controllers/email.controller';

const router = Router();

router.post('/send-test', sendTestEmail);
router.get('/logs', getEmailLogs);

export default router;