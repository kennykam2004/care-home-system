import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getCashRecords, addCashRecord, deleteCashRecord } from '../controllers/cashRecord.controller.js';

const router = Router();

router.get('/', authenticate, getCashRecords);
router.post('/', authenticate, addCashRecord);
router.delete('/:id', authenticate, deleteCashRecord);

export default router;
