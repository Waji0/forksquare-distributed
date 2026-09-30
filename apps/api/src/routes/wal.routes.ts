import { Router } from 'express';
import { runWALDemo, getWALLog, resetWAL } from '../controllers/wal.controller';

const router = Router();

router.post('/demo', runWALDemo);
router.get('/log', getWALLog);
router.post('/reset', resetWAL);

export default router;