import PantryItem from '../models/PantryItem.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/pantry
 * Query: category?, is_running_low? ('true'|'false'), search?
 * Lấy danh sách pantry của user, có thể lọc theo category, running low, tìm theo tên.
 */
export async function getPantryItems(req, res) {
  try {
    const { category, is_running_low, search } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (is_running_low === 'true') filters.is_running_low = true;
    if (is_running_low === 'false') filters.is_running_low = false;
    if (search && String(search).trim()) filters.search = String(search).trim();

    const items = await PantryItem.findByUserId(req.user.id, filters);

    return successResponse(res, { items }, 'Pantry items fetched successfully.');
  } catch (err) {
    console.error('getPantryItems error:', err);
    return errorResponse(res, 'Failed to fetch pantry items.', 500);
  }
}

/**
 * GET /api/pantry/stats
 * Lấy thống kê pantry: tổng item, số category, running low, sắp hết hạn (7 ngày).
 */
export async function getPantryStats(req, res) {
  try {
    const stats = await PantryItem.getStats(req.user.id);
    return successResponse(res, { stats }, 'Pantry stats fetched successfully.');
  } catch (err) {
    console.error('getPantryStats error:', err);
    return errorResponse(res, 'Failed to fetch pantry stats.', 500);
  }
}

/**
 * GET /api/pantry/expiring-soon
 * Query: days? (mặc định 7) — lấy item có expiry_date trong N ngày tới.
 */
export async function getExpiringSoon(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const items = await PantryItem.findExpiringSoon(req.user.id, days);
    return successResponse(res, { items }, 'Expiring items fetched successfully.');
  } catch (err) {
    console.error('getExpiringSoon error:', err);
    return errorResponse(res, 'Failed to fetch expiring items.', 500);
  }
}

/**
 * POST /api/pantry
 * Body: { name, quantity, unit, category, expiry_date?, is_running_low? }
 * Thêm một item vào pantry của user.
 */
export async function addPantryItem(req, res) {
  try {
    const item = await PantryItem.createItem(req.user.id, req.body);
    return successResponse(res, { item }, 'Item added to pantry.', 201);
  } catch (err) {
    console.error('addPantryItem error:', err);
    return errorResponse(res, 'Failed to add pantry item.', 500);
  }
}

/**
 * PUT /api/pantry/:id
 * Body: { name?, quantity?, unit?, category?, expiry_date?, is_running_low? }
 * Cập nhật pantry item (partial update; scoped to user).
 */
export async function updatePantryItem(req, res) {
  try {
    const { id } = req.params;
    const item = await PantryItem.updateItem(id, req.user.id, req.body);
    if (!item) {
      return errorResponse(res, 'Pantry item not found.', 404);
    }
    return successResponse(res, { item }, 'Pantry item updated.');
  } catch (err) {
    console.error('updatePantryItem error:', err);
    return errorResponse(res, 'Failed to update pantry item.', 500);
  }
}

/**
 * DELETE /api/pantry/:id
 * Xóa pantry item (scoped to user).
 */
export async function deletePantryItem(req, res) {
  try {
    const { id } = req.params;
    const deleted = await PantryItem.deleteItem(id, req.user.id);
    if (!deleted) {
      return errorResponse(res, 'Pantry item not found.', 404);
    }
    return successResponse(res, {}, 'Pantry item deleted.');
  } catch (err) {
    console.error('deletePantryItem error:', err);
    return errorResponse(res, 'Failed to delete pantry item.', 500);
  }
}
