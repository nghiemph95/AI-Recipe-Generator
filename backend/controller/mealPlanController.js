import MealPlan from '../models/MealPlan.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * POST /api/meal-plans
 * Body: { recipe_id, meal_date } hoặc { recipe_id, planned_date, meal_type }
 * Thêm recipe vào meal plan (upsert: cùng user/ngày/meal_type thì cập nhật recipe_id).
 */
export async function addToMealPlan(req, res) {
  try {
    const mealPlan = await MealPlan.createPlan(req.user.id, req.body);
    return successResponse(res, { mealPlan }, 'Recipe added to meal plan.', 201);
  } catch (err) {
    console.error('addToMealPlan error:', err);
    return errorResponse(res, 'Failed to add recipe to meal plan.', 500);
  }
}

/**
 * GET /api/meal-plans/weekly
 * Query: start_date? hoặc weekStartDate? (ngày bắt đầu tuần, YYYY-MM-DD)
 * Lấy meal plan 7 ngày từ ngày bắt đầu.
 */
export async function getWeeklyMealPlan(req, res) {
  try {
    const { start_date, weekStartDate } = req.query;
    const startDate = start_date || weekStartDate;
    if (!startDate) {
      return errorResponse(res, 'Please provide start_date or weekStartDate.', 400);
    }
    const mealPlans = await MealPlan.getWeeklyPlan(req.user.id, startDate);
    return successResponse(res, { mealPlans }, 'Weekly meal plan fetched successfully.');
  } catch (err) {
    console.error('getWeeklyMealPlan error:', err);
    return errorResponse(res, 'Failed to fetch weekly meal plan.', 500);
  }
}

/**
 * GET /api/meal-plans/upcoming
 * Query: limit? (mặc định 5) — lấy bữa sắp tới từ hôm nay.
 */
export async function getUpcomingMeals(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const meals = await MealPlan.getUpcoming(req.user.id, limit);
    return successResponse(res, { meals }, 'Upcoming meals fetched successfully.');
  } catch (err) {
    console.error('getUpcomingMeals error:', err);
    return errorResponse(res, 'Failed to fetch upcoming meals.', 500);
  }
}

/**
 * DELETE /api/meal-plans/:id
 * Xóa một meal plan entry; scoped to user.
 */
export async function deleteMealPlan(req, res) {
  try {
    const { id } = req.params;
    const mealPlan = await MealPlan.deletePlan(id, req.user.id);
    if (!mealPlan) {
      return errorResponse(res, 'Meal plan entry not found.', 404);
    }
    return successResponse(res, { mealPlan }, 'Meal plan entry deleted.');
  } catch (err) {
    console.error('deleteMealPlan error:', err);
    return errorResponse(res, 'Failed to delete meal plan entry.', 500);
  }
}

/**
 * GET /api/meal-plans/stats
 * Lấy thống kê meal plan: total_planned_meals, this_week_count.
 */
export async function getMealPlanStats(req, res) {
  try {
    const stats = await MealPlan.getStats(req.user.id);
    return successResponse(res, { stats }, 'Meal plan stats fetched successfully.');
  } catch (err) {
    console.error('getMealPlanStats error:', err);
    return errorResponse(res, 'Failed to fetch meal plan stats.', 500);
  }
}
