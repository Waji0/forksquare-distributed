import { Router } from 'express';
import { getTopology, routeQuery, killReplica, recoverReplica, simulateTraffic } from '../controllers/replica.controller';

const router = Router();

router.get('/topology', getTopology);
router.post('/route-query', routeQuery);
router.post('/kill', killReplica);
router.post('/recover', recoverReplica);
router.post('/simulate-traffic', simulateTraffic);

export default router;