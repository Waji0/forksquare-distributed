import { Router } from 'express';
import {
  listPartitions,
  explainPartitionPruning,
  getDistribution,
} from '../controllers/partition.controller';

const router = Router();

router.get('/list', listPartitions);
router.get('/explain', explainPartitionPruning);
router.get('/distribution', getDistribution);

export default router;