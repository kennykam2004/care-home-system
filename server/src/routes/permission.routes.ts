import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getModulePermissions, getRolePermissions, updateRolePermissions } from '../controllers/permission.controller.js';

const router = Router();

router.get('/modules', authenticate, getModulePermissions);
router.get('/roles/:roleId', authenticate, getRolePermissions);
router.put('/roles/:roleId', authenticate, requireRole('院長'), updateRolePermissions);

export default router;
