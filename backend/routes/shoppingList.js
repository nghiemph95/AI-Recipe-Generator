import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as shoppingListController from '../controller/shoppingListController.js';

const router = Router();

router.use(authenticate);

router.get('/', shoppingListController.getShoppingList);
router.post('/generate', shoppingListController.generateFromMealPlan);
router.post('/add-checked-to-pantry', shoppingListController.addCheckedToPantry);
router.post('/', shoppingListController.addItem);
router.delete('/checked', shoppingListController.clearChecked);
router.delete('/clear-all', shoppingListController.clearAll);
router.patch('/:id/toggle', shoppingListController.toggleChecked);
router.put('/:id', shoppingListController.updateItem);
router.delete('/:id', shoppingListController.deleteItem);

export default router;
