import { Router } from 'express';
import { searchSimilarFoods, addFoodEmbedding, getVectorStats } from '../controllers/similar.controller';

const router = Router();

router.get('/search', searchSimilarFoods);
router.post('/add', addFoodEmbedding);
router.get('/stats', getVectorStats);

export default router;