import { Router } from 'express';
import { adminLogin, adminLogout, listAdmins } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';

const adminRouter = Router();

adminRouter.post('/login', adminLogin);
adminRouter.post('/logout', adminLogout);
// Cross-service lookup (any authenticated caller) — used by billing_service's
// findAllAdmins() to resolve real Admin recipient IDs.
adminRouter.get('/list', authMiddleware, listAdmins);

export default adminRouter;
