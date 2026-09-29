import { Router } from 'express';
import { getRingStats, addNode, removeNode, lookupKey, getDistribution } from '../controllers/hashRing.controller';

const router = Router();

router.get('/stats', getRingStats);
router.post('/add-node', addNode);
router.post('/remove-node', removeNode);
router.get('/lookup', lookupKey);
router.get('/distribution', getDistribution);

export default router;