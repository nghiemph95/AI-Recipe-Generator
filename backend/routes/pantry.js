import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as pantryController from '../controller/pantryController.js';

const router = Router();

router.use(authenticate);

router.get('/', pantryController.getPantryItems);
router.get('/stats', pantryController.getPantryStats);
router.get('/expiring-soon', pantryController.getExpiringSoon);
router.post('/', pantryController.addPantryItem);
router.put('/:id', pantryController.updatePantryItem);
router.delete('/:id', pantryController.deletePantryItem);

export default router;
