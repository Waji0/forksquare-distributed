import { Router } from 'express';
import { createIntent, confirmIntent, refundIntent, getWebhooks, getAllIntents } from '../controllers/payment.controller';

const router = Router();

router.post('/create-intent', createIntent);
router.post('/:intentId/confirm', confirmIntent);
router.post('/:intentId/refund', refundIntent);
router.get('/webhooks', getWebhooks);
router.get('/intents', getAllIntents);

export default router;