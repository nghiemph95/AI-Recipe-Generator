/**
 * Gemini AI helpers for recipe generation and pantry suggestions.
 * Replace with real Gemini API calls when GEMINI_API_KEY is configured.
 */

/**
 * Generate a recipe from ingredients and options.
 * @param {{ ingredients: string[], dietaryRestrictions?: string[], cuisineType?: string, servings?: number, cookingTime?: string }} options
 * @returns {Promise<{ name: string, description: string, ingredients: { name: string, quantity: number, unit: string }[], instructions: string[], cuisine_type?: string, difficulty?: string, prep_time?: number, cook_time?: number, servings?: number, dietary_tags?: string[] }>}
 */
export async function generateRecipe(options) {
  const { ingredients = [], dietaryRestrictions = [], cuisineType = 'any', servings = 4, cookingTime = 'medium' } = options;
  // TODO: integrate real Gemini API (e.g. Google Generative AI SDK) using process.env.GEMINI_API_KEY
  // Stub: return a placeholder recipe so the endpoint works until AI is wired.
  const ingredientList = Array.isArray(ingredients) && ingredients.length > 0
    ? ingredients
    : ['chicken', 'rice'];
  return {
    name: `Generated recipe with ${ingredientList.slice(0, 3).join(', ')}`,
    description: `A recipe using: ${ingredientList.join(', ')}. Customize with your preferred spices and method.`,
    ingredients: ingredientList.map((name, i) => ({
      name,
      quantity: 1 + (i % 2),
      unit: i % 2 === 0 ? 'cup' : 'piece',
    })),
    instructions: [
      'Prepare all ingredients.',
      'Combine and cook according to your preference.',
      'Season and serve.',
    ],
    cuisine_type: cuisineType !== 'any' ? cuisineType : null,
    difficulty: cookingTime === 'short' ? 'easy' : cookingTime === 'long' ? 'hard' : 'medium',
    prep_time: 15,
    cook_time: cookingTime === 'short' ? 20 : cookingTime === 'long' ? 60 : 30,
    servings: Number(servings) || 4,
    dietary_tags: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
  };
}

/**
 * Generate pantry/shopping suggestions.
 * Call style 1: generatePantrySuggestions({ ingredients?, limit? })
 * Call style 2: generatePantrySuggestions(pantryItems, expiringNames) — smart suggestions from pantry + expiring items.
 * @param {{ ingredients?: string[], limit?: number }} optionsOrPantryItems
 * @param {string[]} [expiringNames]
 * @returns {Promise<string[]>}
 */
export async function generatePantrySuggestions(optionsOrPantryItems, expiringNames) {
  if (Array.isArray(optionsOrPantryItems) && Array.isArray(expiringNames)) {
    const pantryItems = optionsOrPantryItems;
    const pantryNames = pantryItems.map((item) => (item && item.name) || String(item));
    const combined = [...new Set([...pantryNames, ...expiringNames])];
    const defaults = ['olive oil', 'salt', 'pepper', 'garlic', 'onion'];
    return [...new Set([...combined, ...defaults])].slice(0, 15);
  }
  const options = optionsOrPantryItems || {};
  const { ingredients = [], limit = 10 } = options;
  const defaults = ['olive oil', 'salt', 'pepper', 'garlic', 'onion'];
  const combined = [...new Set([...defaults, ...(Array.isArray(ingredients) ? ingredients : [])])];
  return combined.slice(0, Number(limit) || 10);
}
