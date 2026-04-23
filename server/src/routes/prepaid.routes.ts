import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getPrepaidRecords, addPrepaidRecord } from '../controllers/prepaid.controller.js';

const router = Router();

router.get('/', authenticate, getPrepaidRecords);
router.post('/', authenticate, addPrepaidRecord);

export default router;
