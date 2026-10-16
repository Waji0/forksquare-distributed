import { Router } from 'express';
import { executeReal2PC, getBlockedTransactions, recoverTransaction } from '../controllers/real2pc.controller';

const router = Router();

router.post('/execute', executeReal2PC);
router.get('/blocked', getBlockedTransactions);
router.post('/recover', recoverTransaction);

export default router;