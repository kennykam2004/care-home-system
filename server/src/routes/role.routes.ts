import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/role.controller.js';

const router = Router();

router.get('/', authenticate, getRoles);
router.post('/', authenticate, requireRole('院長'), createRole);
router.put('/:id', authenticate, requireRole('院長'), updateRole);
router.delete('/:id', authenticate, requireRole('院長'), deleteRole);

export default router;
