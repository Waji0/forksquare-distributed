import { Router } from 'express';
import {
  getReplicationStatus,
  getStandbyStatus,
  demonstrateReplicationLag,
  verifyReadOnly,
} from '../controllers/replication.controller';

const router = Router();

router.get('/status', getReplicationStatus);
router.get('/standby-status', getStandbyStatus);
router.get('/lag-demo', demonstrateReplicationLag);
router.get('/verify-read-only', verifyReadOnly);

export default router;