import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as userController from '../controller/userController.js';

const router = Router();

// All user routes are protected
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);
router.delete('/account', userController.deleteAccount);

export default router;
