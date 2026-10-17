import { Router } from 'express';
import { initDistributedSql, showRanges, compareDatabases } from '../controllers/distributedSql.controller';

const router = Router();

router.post('/init', initDistributedSql);
router.get('/ranges', showRanges);
router.get('/compare', compareDatabases);

export default router;