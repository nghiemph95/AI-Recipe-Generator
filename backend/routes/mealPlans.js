import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as mealPlanController from '../controller/mealPlanController.js';

const router = Router();

router.use(authenticate);

router.get('/weekly', mealPlanController.getWeeklyMealPlan);
router.get('/upcoming', mealPlanController.getUpcomingMeals);
router.get('/stats', mealPlanController.getMealPlanStats);
router.post('/', mealPlanController.addToMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

export default router;
