import { Router } from 'express';
import { getEventLogs } from '../controllers/event.controller';

const router = Router();
router.get('/logs', getEventLogs);
export default router;