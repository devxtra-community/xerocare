import { Router } from 'express';
import { adminLogin, adminLogout } from '../controllers/adminController';

const adminRouter = Router();

adminRouter.post('/login', adminLogin);
adminRouter.post('/logout', adminLogout);

export default adminRouter;
