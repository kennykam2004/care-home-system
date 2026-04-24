import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getAuditLogsHandler } from '../controllers/audit.controller.js';

const router = Router();

router.get('/', authenticate, getAuditLogsHandler);

export default router;