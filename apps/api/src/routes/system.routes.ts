import { Router } from 'express';
import { getSystemStats, resetSystemStats } from '../controllers/system.controller';

const router = Router();

router.get('/stats', getSystemStats);
router.post('/stats/reset', resetSystemStats);

export default router;