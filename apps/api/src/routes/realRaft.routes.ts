import { Router } from 'express';
import { getClusterState, campaignForLeader, resignLeadership, replicateLog } from '../controllers/realRaft.controller';

const router = Router();

router.get('/cluster', getClusterState);
router.post('/campaign', campaignForLeader);
router.post('/resign', resignLeadership);
router.post('/replicate', replicateLog);

export default router;