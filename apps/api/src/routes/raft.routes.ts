import { Router } from 'express';
import { runElection, killNode, appendLog, getClusterState } from '../controllers/raft.controller';

const router = Router();

router.post('/election', runElection);
router.post('/kill-node', killNode);
router.post('/append-log', appendLog);
router.get('/state', getClusterState);

export default router;