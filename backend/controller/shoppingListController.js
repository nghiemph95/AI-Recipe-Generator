import ShoppingListItem from '../models/ShoppingList.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * POST /api/shopping-list/generate
 * Body: { startDate, endDate }
 * Sinh shopping list từ meal plan trong khoảng ngày.
 */
export async function generateFromMealPlan(req, res) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return errorResponse(res, 'Please provide startDate and endDate.', 400);
    }
    const items = await ShoppingListItem.generateFromMealPlan(req.user.id, startDate, endDate);
    return successResponse(res, { items }, 'Shopping list generated from meal plan.');
  } catch (err) {
    console.error('generateFromMealPlan error:', err);
    return errorResponse(res, 'Failed to generate shopping list from meal plan.', 500);
  }
}

/**
 * GET /api/shopping-list
 * Query: grouped? ('true' → nhóm theo category)
 * Lấy danh sách shopping list của user.
 */
export async function getShoppingList(req, res) {
  try {
    const grouped = req.query.grouped === 'true';
    const items = grouped
      ? await ShoppingListItem.getGroupedByCategory(req.user.id)
      : await ShoppingListItem.findByUserId(req.user.id);
    return successResponse(res, { items }, 'Shopping list fetched successfully.');
  } catch (err) {
    console.error('getShoppingList error:', err);
    return errorResponse(res, 'Failed to fetch shopping list.', 500);
  }
}

/**
 * POST /api/shopping-list
 * Body: { ingredient_name, quantity, unit, category? }
 * Thêm item vào shopping list (thêm tay).
 */
export async function addItem(req, res) {
  try {
    const item = await ShoppingListItem.createItem(req.user.id, req.body);
    return successResponse(res, { item }, 'Item added to shopping list.', 201);
  } catch (err) {
    console.error('addItem error:', err);
    return errorResponse(res, 'Failed to add item to shopping list.', 500);
  }
}

/**
 * PUT /api/shopping-list/:id
 * Body: { ingredient_name?, quantity?, unit?, category?, is_checked? }
 * Cập nhật item; scoped to user.
 */
export async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const item = await ShoppingListItem.updateItem(id, req.user.id, req.body);
    if (!item) {
      return errorResponse(res, 'Shopping list item not found.', 404);
    }
    return successResponse(res, { item }, 'Item updated.');
  } catch (err) {
    console.error('updateItem error:', err);
    return errorResponse(res, 'Failed to update shopping list item.', 500);
  }
}

/**
 * PATCH /api/shopping-list/:id/toggle (hoặc PUT :id/toggle)
 * Bật/tắt trạng thái checked của item.
 */
export async function toggleChecked(req, res) {
  try {
    const { id } = req.params;
    const item = await ShoppingListItem.toggleChecked(id, req.user.id);
    if (!item) {
      return errorResponse(res, 'Shopping list item not found.', 404);
    }
    return successResponse(res, { item }, 'Item checked status toggled.');
  } catch (err) {
    console.error('toggleChecked error:', err);
    return errorResponse(res, 'Failed to toggle item.', 500);
  }
}

/**
 * DELETE /api/shopping-list/:id
 * Xóa một item; scoped to user.
 */
export async function deleteItem(req, res) {
  try {
    const { id } = req.params;
    const item = await ShoppingListItem.delete(id, req.user.id);
    if (!item) {
      return errorResponse(res, 'Shopping list item not found.', 404);
    }
    return successResponse(res, { item }, 'Item deleted.');
  } catch (err) {
    console.error('deleteItem error:', err);
    return errorResponse(res, 'Failed to delete shopping list item.', 500);
  }
}

/**
 * DELETE /api/shopping-list/checked (hoặc POST .../clear-checked)
 * Xóa chỉ các item đã checked (không chuyển vào pantry).
 */
export async function clearChecked(req, res) {
  try {
    const checkedItems = await ShoppingListItem.findAll({
      where: { user_id: req.user.id, is_checked: true },
    });
    const items = checkedItems.map((i) => i.toJSON());
    await ShoppingListItem.destroy({
      where: { user_id: req.user.id, is_checked: true },
    });
    return successResponse(res, { items }, 'Checked items cleared.');
  } catch (err) {
    console.error('clearChecked error:', err);
    return errorResponse(res, 'Failed to clear checked items.', 500);
  }
}

/**
 * DELETE /api/shopping-list (hoặc POST .../clear-all)
 * Xóa toàn bộ shopping list của user.
 */
export async function clearAll(req, res) {
  try {
    const items = await ShoppingListItem.clearAll(req.user.id);
    return successResponse(res, { items }, 'Shopping list cleared.');
  } catch (err) {
    console.error('clearAll error:', err);
    return errorResponse(res, 'Failed to clear shopping list.', 500);
  }
}

/**
 * POST /api/shopping-list/add-checked-to-pantry
 * Chuyển các item đã check vào pantry rồi xóa khỏi shopping list.
 */
export async function addCheckedToPantry(req, res) {
  try {
    const items = await ShoppingListItem.addCheckedToPantry(req.user.id);
    return successResponse(res, { items }, 'Checked items added to pantry.');
  } catch (err) {
    console.error('addCheckedToPantry error:', err);
    return errorResponse(res, 'Failed to add checked items to pantry.', 500);
  }
}
