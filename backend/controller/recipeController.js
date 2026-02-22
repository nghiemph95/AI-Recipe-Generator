import Recipe from '../models/Recipe.js';
import PantryItem from '../models/PantryItem.js';
import { generateRecipe as generateRecipeAI, generatePantrySuggestions as generatePantrySuggestionsAI } from '../utils/gemini.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * POST /api/recipes/generate
 * Body: { ingredients?: string[], usePantryIngredients?: boolean, dietaryRestrictions?: string[], cuisineType?: string, servings?: number, cookingTime?: string }
 * Sinh công thức bằng AI từ nguyên liệu (có thể gộp thêm nguyên liệu từ pantry).
 */
export async function generateRecipe(req, res) {
  try {
    const {
      ingredients = [],
      usePantryIngredients = false,
      dietaryRestrictions = [],
      cuisineType = 'any',
      servings = 4,
      cookingTime = 'medium',
    } = req.body;

    let finalIngredients = Array.isArray(ingredients) ? [...ingredients] : [];

    if (usePantryIngredients) {
      const pantryItems = await PantryItem.findByUserId(req.user.id);
      const pantryIngredientNames = pantryItems.map((item) => item.name);
      finalIngredients = [...new Set([...finalIngredients, ...pantryIngredientNames])];
    }

    if (finalIngredients.length === 0) {
      return errorResponse(res, 'Please provide at least one ingredient.', 400);
    }

    const recipe = await generateRecipeAI({
      ingredients: finalIngredients,
      dietaryRestrictions,
      cuisineType,
      servings,
      cookingTime,
    });

    return successResponse(res, { recipe }, 'Recipe generated successfully.');
  } catch (err) {
    console.error('generateRecipe error:', err);
    return errorResponse(res, 'Failed to generate recipe.', 500);
  }
}

/**
 * POST /api/recipes/generate/pantry-suggestions
 * Body: { ingredients?: string[], limit?: number }
 * Gợi ý nguyên liệu nên có trong pantry (AI).
 */
export async function generatePantrySuggestions(req, res) {
  try {
    const { ingredients = [], limit = 10 } = req.body;
    const suggestions = await generatePantrySuggestionsAI({
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      limit,
    });
    return successResponse(res, { suggestions }, 'Pantry suggestions generated.');
  } catch (err) {
    console.error('generatePantrySuggestions error:', err);
    return errorResponse(res, 'Failed to generate pantry suggestions.', 500);
  }
}

/**
 * GET /api/recipes/pantry-suggestions (hoặc tương tự)
 * Lấy gợi ý pantry thông minh: dựa trên toàn bộ pantry + danh sách item sắp hết hạn (7 ngày).
 */
export async function getPantrySuggestions(req, res) {
  try {
    const pantryItems = await PantryItem.findByUserId(req.user.id);
    const expiringItems = await PantryItem.findExpiringSoon(req.user.id, 7);
    const expiringNames = expiringItems.map((item) => item.name);
    const suggestions = await generatePantrySuggestionsAI(pantryItems, expiringNames);
    return successResponse(res, { suggestions }, 'Smart pantry suggestions generated.');
  } catch (err) {
    console.error('getPantrySuggestions error:', err);
    return errorResponse(res, 'Failed to get pantry suggestions.', 500);
  }
}

/**
 * GET /api/recipes
 * Query: search?, cuisine_type?, difficulty?, dietary_tag?, max_cook_time?, sort_by?, sort_order?, limit?, offset?
 * Lấy danh sách recipe của user (filter, sort, phân trang).
 */
export async function getRecipes(req, res) {
  try {
    const { search, cuisine_type, difficulty, dietary_tag, max_cook_time, sort_by, sort_order, limit, offset } = req.query;
    const recipes = await Recipe.findByUserId(req.user.id, {
      search,
      cuisine_type,
      difficulty,
      dietary_tag,
      max_cook_time: max_cook_time ? parseInt(max_cook_time, 10) : undefined,
      sort_by,
      sort_order,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return successResponse(res, { recipes }, 'Recipes fetched successfully.');
  } catch (err) {
    console.error('getRecipes error:', err);
    return errorResponse(res, 'Failed to fetch recipes.', 500);
  }
}

/**
 * GET /api/recipes/recent
 * Query: limit? (mặc định 5) — lấy recipe mới nhất theo created_at.
 */
export async function getRecentRecipes(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const recipes = await Recipe.getRecent(req.user.id, limit);
    return successResponse(res, { recipes }, 'Recent recipes fetched successfully.');
  } catch (err) {
    console.error('getRecentRecipes error:', err);
    return errorResponse(res, 'Failed to fetch recent recipes.', 500);
  }
}

/**
 * GET /api/recipes/:id
 * Lấy một recipe theo id (kèm ingredients, nutrition); scoped to user.
 */
export async function getRecipeById(req, res) {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id, req.user.id);
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, { recipe }, 'Recipe fetched successfully.');
  } catch (err) {
    console.error('getRecipeById error:', err);
    return errorResponse(res, 'Failed to fetch recipe.', 500);
  }
}

/**
 * POST /api/recipes
 * Body: { name, description, instructions, ingredients?: [{ name, quantity, unit }], nutrition?, cuisine_type?, difficulty?, prep_time?, cook_time?, servings?, dietary_tags?, user_notes?, image_url? }
 * Lưu recipe mới vào DB (user hiện tại).
 */
export async function saveRecipe(req, res) {
  try {
    const recipe = await Recipe.createRecipe(req.user.id, req.body);
    return successResponse(res, { recipe }, 'Recipe saved successfully.', 201);
  } catch (err) {
    console.error('saveRecipe error:', err);
    return errorResponse(res, 'Failed to save recipe.', 500);
  }
}

/**
 * PUT /api/recipes/:id
 * Body: { name?, description?, cuisine_type?, difficulty?, prep_time?, cook_time?, servings?, instructions?, dietary_tags?, user_notes?, image_url? } (partial update)
 * Cập nhật recipe; scoped to user.
 */
export async function updateRecipe(req, res) {
  try {
    const { id } = req.params;
    const recipe = await Recipe.updateRecipe(id, req.user.id, req.body);
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, { recipe }, 'Recipe updated successfully.');
  } catch (err) {
    console.error('updateRecipe error:', err);
    return errorResponse(res, 'Failed to update recipe.', 500);
  }
}

/**
 * DELETE /api/recipes/:id
 * Xóa recipe; scoped to user. Trả về recipe đã xóa.
 */
export async function deleteRecipe(req, res) {
  try {
    const { id } = req.params;
    const recipe = await Recipe.deleteRecipe(id, req.user.id);
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, { recipe }, 'Recipe deleted successfully.');
  } catch (err) {
    console.error('deleteRecipe error:', err);
    return errorResponse(res, 'Failed to delete recipe.', 500);
  }
}

/**
 * GET /api/recipes/stats
 * Lấy thống kê recipe của user: total_recipes, cuisine_types_count, avg_cook_time.
 */
export async function getRecipeStats(req, res) {
  try {
    const stats = await Recipe.getStats(req.user.id);
    return successResponse(res, { stats }, 'Recipe stats fetched successfully.');
  } catch (err) {
    console.error('getRecipeStats error:', err);
    return errorResponse(res, 'Failed to fetch recipe stats.', 500);
  }
}
