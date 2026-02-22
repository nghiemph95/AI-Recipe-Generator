/**
 * Gemini AI: recipe generation and pantry suggestions.
 * Uses @google/genai with GEMINI_API_KEY.
 */
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

const MODEL = "gemini-2.5-flash";

/**
 * Strip markdown code fence (```json ... ```) from AI output.
 */
function stripMarkdownJson(text) {
  let s = (text || "").trim();
  if (s.startsWith("```json")) {
    s = s.replace(/^```json\s*\n?/i, "").replace(/\n?```\s*$/g, "");
  } else if (s.startsWith("```")) {
    s = s.replace(/^```\s*\n?/g, "").replace(/\n?```\s*$/g, "");
  }
  return s.trim();
}

/**
 * Generate a recipe from ingredients and options (Gemini).
 * options: { ingredients, dietaryRestrictions?, cuisineType?, servings?, cookingTime? }
 * Returns Recipe-shaped object: name, description, ingredients, instructions, cuisine_type, difficulty, prep_time, cook_time, servings, dietary_tags, nutrition.
 */
export async function generateRecipe(options) {
  if (!ai) throw new Error("Gemini API is not configured (GEMINI_API_KEY).");

  const {
    ingredients = [],
    dietaryRestrictions = [],
    cuisineType = "any",
    servings = 4,
    cookingTime = "medium",
  } = options;

  const ingredientList =
    Array.isArray(ingredients) && ingredients.length > 0
      ? ingredients
      : ["chicken", "rice"];
  const dietaryInfo =
    dietaryRestrictions.length > 0
      ? dietaryRestrictions.join(", ")
      : "No dietary restrictions";
  const timeGuide = {
    quick: "under 30 minutes",
    medium: "30–60 minutes",
    long: "over 60 minutes",
  };
  const cookingTimeDesc = timeGuide[cookingTime] || "any";

  const prompt = `Generate a detailed recipe with the following requirements:
Ingredients available: ${ingredientList.join(", ")}
Dietary restrictions: ${dietaryInfo}
Cuisine type: ${cuisineType}
Servings: ${servings}
Cooking time: ${cookingTimeDesc}

Please provide a complete recipe in the following JSON format (return ONLY valid JSON, no markdown):
{
  "name": "Recipe name",
  "description": "Brief description of the dish",
  "cuisineType": "${cuisineType}",
  "difficulty": "easy|medium|hard",
  "prepTime": number (in minutes),
  "cookTime": number (in minutes),
  "servings": ${servings},
  "ingredients": [
    { "name": "ingredient name", "quantity": number, "unit": "unit of measurement" }
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "dietaryTags": ["e.g. vegetarian", "gluten-free"],
  "nutrition": {
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fats": number (grams),
    "fiber": number (grams)
  },
  "cookingTips": ["Tip 1", "Tip 2"]
}

Make sure the recipe is creative, delicious, and uses the provided ingredients effectively.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const rawText = (response.text || "").trim();
  const jsonStr = stripMarkdownJson(rawText);
  let data;

  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error(
      "Gemini recipe JSON parse error:",
      e.message,
      "Raw:",
      rawText?.slice(0, 200),
    );
    throw new Error("Could not parse recipe from AI response.");
  }

  return {
    name: data.name || "Generated Recipe",
    description: data.description || "",
    cuisine_type:
      data.cuisineType || (cuisineType !== "any" ? cuisineType : null),
    difficulty: ["easy", "medium", "hard"].includes(data.difficulty)
      ? data.difficulty
      : "medium",
    prep_time: typeof data.prepTime === "number" ? data.prepTime : 10,
    cook_time: typeof data.cookTime === "number" ? data.cookTime : 25,
    servings: typeof data.servings === "number" ? data.servings : servings,
    instructions: Array.isArray(data.instructions)
      ? data.instructions
      : ["Prepare and cook as desired."],
    ingredients: (Array.isArray(data.ingredients) ? data.ingredients : []).map(
      (ing) => ({
        name: ing.name || "ingredient",
        quantity: typeof ing.quantity === "number" ? ing.quantity : 1,
        unit: ing.unit || "unit",
      }),
    ),
    dietary_tags: Array.isArray(data.dietaryTags) ? data.dietaryTags : [],
    nutrition:
      data.nutrition && typeof data.nutrition === "object"
        ? {
            calories: data.nutrition.calories,
            protein: data.nutrition.protein,
            carbs: data.nutrition.carbs,
            fats: data.nutrition.fats,
            fiber: data.nutrition.fiber,
          }
        : null,
    cooking_tips: Array.isArray(data.cookingTips) ? data.cookingTips : [],
  };
}

/**
 * Suggest pantry ingredients (Gemini).
 * Call 1: generatePantrySuggestions({ ingredients: string[], limit?: number })
 * Call 2: generatePantrySuggestions(pantryItems, expiringNames) — pantryItems array of objects with .name, expiringNames array of strings.
 * Returns { suggestions: string[] }.
 */
export async function generatePantrySuggestions(arg1, arg2) {
  if (!ai) throw new Error("Gemini API is not configured (GEMINI_API_KEY).");

  let prompt;
  let limit = 10;

  if (
    arg1 &&
    typeof arg1 === "object" &&
    !Array.isArray(arg1) &&
    "ingredients" in arg1
  ) {
    const { ingredients = [], limit: lim = 10 } = arg1;
    limit = Math.min(Number(lim) || 10, 20);
    const list = Array.isArray(ingredients) ? ingredients : [];
    prompt = `List ${limit} pantry ingredients that go well with: ${list.join(", ") || "general cooking"}. Return only a JSON array of strings, e.g. ["tomatoes","olive oil"]. No other text.`;
  } else {
    const pantryItems = Array.isArray(arg1) ? arg1 : [];
    const expiringNames = Array.isArray(arg2) ? arg2 : [];
    const pantryNames = pantryItems
      .map((i) => (i && i.name) || String(i))
      .filter(Boolean);
    prompt = `Based on current pantry: ${pantryNames.join(", ") || "empty"}. ${expiringNames.length > 0 ? `These expire soon: ${expiringNames.join(", ")}. ` : ""}Suggest ${limit} useful pantry items to buy (to cook with what they have or use soon). Return only a JSON array of strings, e.g. ["onions","garlic"]. No other text.`;
    limit = Math.min(limit, 20);
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const rawText = (response.text || "").trim();
  const jsonStr = stripMarkdownJson(rawText);
  let list;

  try {
    list = JSON.parse(jsonStr);
  } catch {
    list = [];
  }

  const suggestions = Array.isArray(list)
    ? list
        .slice(0, limit)
        .map((s) => (typeof s === "string" ? s : String(s)).trim())
        .filter(Boolean)
    : [];

  return { suggestions };
}

/** Language code to full name for prompt */
const LANGUAGE_NAMES = {
  vi: "Vietnamese",
  en: "English",
};

/**
 * Translate a recipe's text fields to the target language (Gemini).
 * recipe: { name, description, ingredients: [{ name, quantity, unit }], instructions, dietaryTags?, cookingTips? }
 * targetLanguage: 'vi' | 'en' or full name e.g. 'Vietnamese'
 * Returns recipe with same structure, text fields translated; numbers/units unchanged.
 */
export async function translateRecipe(recipe, targetLanguage) {
  if (!ai) throw new Error("Gemini API is not configured (GEMINI_API_KEY).");
  if (!recipe || !recipe.name) throw new Error("Recipe is required for translation.");

  const langName =
    LANGUAGE_NAMES[targetLanguage] ||
    (typeof targetLanguage === "string" ? targetLanguage : "Vietnamese");

  const payload = {
    name: recipe.name,
    description: recipe.description || "",
    ingredients: (recipe.ingredients || []).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    instructions: recipe.instructions || [],
    dietaryTags: recipe.dietary_tags || recipe.dietaryTags || [],
    cookingTips: recipe.cooking_tips || recipe.cookingTips || [],
  };

  const prompt = `Translate this recipe into ${langName}. Keep the exact same JSON structure. Only translate text: name, description, each ingredient "name", each instruction string, dietaryTags strings, cookingTips strings. Keep all numbers (quantity, etc.) and "unit" values unchanged. Return ONLY valid JSON, no markdown.

Input recipe (JSON):
${JSON.stringify(payload)}

Return the translated recipe as a single JSON object with keys: name, description, ingredients (array of { name, quantity, unit }), instructions (array of strings), dietaryTags (array of strings), cookingTips (array of strings).`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const rawText = (response.text || "").trim();
  const jsonStr = stripMarkdownJson(rawText);
  let data;

  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error("translateRecipe JSON parse error:", e.message, "Raw:", rawText?.slice(0, 200));
    throw new Error("Could not parse translated recipe from AI.");
  }

  return {
    ...recipe,
    name: data.name || recipe.name,
    description: data.description ?? recipe.description,
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.map((ing, i) => ({
          name: ing.name || (recipe.ingredients && recipe.ingredients[i]?.name),
          quantity: ing.quantity ?? (recipe.ingredients && recipe.ingredients[i]?.quantity),
          unit: ing.unit ?? (recipe.ingredients && recipe.ingredients[i]?.unit),
        }))
      : recipe.ingredients,
    instructions: Array.isArray(data.instructions) ? data.instructions : recipe.instructions,
    dietary_tags: Array.isArray(data.dietaryTags) ? data.dietaryTags : recipe.dietary_tags || recipe.dietaryTags,
    cooking_tips: Array.isArray(data.cookingTips) ? data.cookingTips : recipe.cooking_tips || recipe.cookingTips,
  };
}
