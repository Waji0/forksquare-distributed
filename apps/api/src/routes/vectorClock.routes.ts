import { Router } from 'express';
import { updateMenuItem, simulateConflict, getMenuState } from '../controllers/vectorClock.controller';

const router = Router();

router.post('/update', updateMenuItem);
router.post('/simulate-conflict', simulateConflict);
router.get('/state', getMenuState);

export default router;