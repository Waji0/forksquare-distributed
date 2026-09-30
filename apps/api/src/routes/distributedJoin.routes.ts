import { Router } from 'express';
import { runSemiJoin, runBloomJoin, getJoinComparison } from '../controllers/distributedJoin.controller';

const router = Router();

router.get('/semi-join', runSemiJoin);
router.get('/bloom-join', runBloomJoin);
router.get('/compare', getJoinComparison);

export default router;