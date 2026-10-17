// import { Router } from 'express';
// import { runWALDemo, getWALLog, resetWAL } from '../controllers/wal.controller';

// const router = Router();

// router.post('/demo', runWALDemo);
// router.get('/log', getWALLog);
// router.post('/reset', resetWAL);

// export default router;





import { Router } from 'express';
import { getWalSegments, getWalStats, triggerCheckpoint } from '../controllers/wal.controller';

const router = Router();

router.get('/segments', getWalSegments);
router.get('/stats', getWalStats);
router.post('/checkpoint', triggerCheckpoint);

export default router;