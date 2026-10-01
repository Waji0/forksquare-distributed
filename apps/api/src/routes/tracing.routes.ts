import { Router } from 'express';
import { getRecentTraces, getTraceById, clearTraces } from '../controllers/tracing.controller';

const router = Router();

router.get('/', getRecentTraces);
router.get('/:traceId', getTraceById);
router.delete('/clear', clearTraces);

export default router;