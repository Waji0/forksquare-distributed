import { Router } from 'express';
import { run2PC, run3PC, compareProtocols } from '../controllers/commitProtocol.controller';

const router = Router();

router.post('/2pc', run2PC);
router.post('/3pc', run3PC);
router.get('/compare', compareProtocols);

export default router;