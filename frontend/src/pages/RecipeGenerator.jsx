import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat, Sparkles, Plus, X, Clock, Users, Languages } from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { recipesApi, usersApi } from '../services/api.js';

const CUISINES = ['Any', 'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Thai', 'French', 'Mediterranean', 'American'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'];
const COOKING_TIMES = [
    { value: 'quick', label: 'Quick (<30 min)' },
    { value: 'medium', label: 'Medium (30-60 min)' },
    { value: 'long', label: 'Long (>60 min)' }
];

// Normalize API recipe to display (backend returns snake_case)
const toDisplay = (r) => r ? {
    name: r.name,
    description: r.description,
    cuisineType: r.cuisine_type || r.cuisineType,
    difficulty: r.difficulty,
    prepTime: r.prep_time ?? r.prepTime,
    cookTime: r.cook_time ?? r.cookTime,
    servings: r.servings,
    ingredients: r.ingredients || [],
    instructions: r.instructions || [],
    dietaryTags: r.dietary_tags || r.dietaryTags || [],
    nutrition: r.nutrition,
    cookingTips: r.cooking_tips || r.cookingTips,
} : null;

const RecipeGenerator = () => {
    const { t } = useTranslation();
    const [ingredients, setIngredients] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [usePantry, setUsePantry] = useState(false);
    const [cuisineType, setCuisineType] = useState('Any');
    const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
    const [servings, setServings] = useState(4);
    const [cookingTime, setCookingTime] = useState('medium');
    const [generating, setGenerating] = useState(false);
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [saving, setSaving] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [translateLanguage, setTranslateLanguage] = useState('vi');

    useEffect(() => {
        usersApi.getPreferences().then((prefs) => {
            if (prefs?.dietary_restrictions?.length) setDietaryRestrictions(prefs.dietary_restrictions);
            if (prefs?.preferred_cuisines?.length) setCuisineType(prefs.preferred_cuisines[0]);
            if (prefs?.default_servings) setServings(prefs.default_servings);
        }).catch(() => {});
    }, []);

    const addIngredient = () => {
        if (inputValue.trim() && !ingredients.includes(inputValue.trim())) {
            setIngredients([...ingredients, inputValue.trim()]);
            setInputValue('');
        }
    };

    const removeIngredient = (ingredient) => {
        setIngredients(ingredients.filter(i => i !== ingredient));
    };

    const toggleDietary = (option) => {
        if (dietaryRestrictions.includes(option)) {
            setDietaryRestrictions(dietaryRestrictions.filter(d => d !== option));
        } else {
            setDietaryRestrictions([...dietaryRestrictions, option]);
        }
    };

    const handleGenerate = async () => {
        if (!usePantry && ingredients.length === 0) {
            toast.error(t('recipeGenerator.addIngredientOrPantry'));
            return;
        }
        setGenerating(true);
        setGeneratedRecipe(null);
        try {
            const res = await recipesApi.generate({
                ingredients,
                usePantryIngredients: usePantry,
                dietaryRestrictions,
                cuisineType: cuisineType === 'Any' ? 'any' : cuisineType,
                servings,
                cookingTime,
            });
            const recipe = res?.recipe;
            setGeneratedRecipe(recipe ? toDisplay(recipe) : null);
            if (recipe) toast.success(t('recipeGenerator.recipeGenerated'));
            else toast.error(t('recipeGenerator.couldNotGenerate'));
        } catch {
            toast.error(t('recipeGenerator.failedGenerate'));
        } finally {
            setGenerating(false);
        }
    };

    const handleTranslate = async () => {
        if (!generatedRecipe) return;
        setTranslating(true);
        try {
            const res = await recipesApi.translate({
                recipe: generatedRecipe,
                targetLanguage: translateLanguage,
            });
            const recipe = res?.recipe;
            setGeneratedRecipe(recipe ? toDisplay(recipe) : generatedRecipe);
            if (recipe) toast.success(t('recipeGenerator.recipeTranslated'));
            else toast.error(t('recipeGenerator.failedTranslate'));
        } catch {
            toast.error(t('recipeGenerator.failedTranslate'));
        } finally {
            setTranslating(false);
        }
    };

    const handleSaveRecipe = async () => {
        if (!generatedRecipe) return;
        const raw = generatedRecipe;
        setSaving(true);
        try {
            await recipesApi.save({
                name: raw.name,
                description: raw.description || '',
                instructions: raw.instructions || [],
                ingredients: (raw.ingredients || []).map((ing) => ({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit || 'unit',
                })),
                nutrition: raw.nutrition || undefined,
                cuisine_type: raw.cuisineType || undefined,
                difficulty: raw.difficulty,
                prep_time: raw.prepTime,
                cook_time: raw.cookTime,
                servings: raw.servings || 4,
                dietary_tags: raw.dietaryTags || [],
            });
            toast.success(t('recipeGenerator.recipeSaved'));
            setGeneratedRecipe(null);
        } catch {
            toast.error(t('recipeGenerator.failedSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('recipeGenerator.title')}</h1>
                    <p className="text-gray-600 mt-2">{t('recipeGenerator.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('recipeGenerator.ingredients')}</h2>

                            <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="use-pantry"
                                    checked={usePantry}
                                    onChange={(e) => setUsePantry(e.target.checked)}
                                    className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                                />
                                <label htmlFor="use-pantry" className="text-sm font-medium text-emerald-900">
                                    {t('recipeGenerator.usePantry')}
                                </label>
                            </div>

                            {/* Manual Ingredient Input */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                                    placeholder={t('recipeGenerator.addIngredientPlaceholder')}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                                <button
                                    onClick={addIngredient}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Ingredient Tags */}
                            {ingredients.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {ingredients.map((ingredient, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                                        >
                                            {ingredient}
                                            <button
                                                onClick={() => removeIngredient(ingredient)}
                                                className="hover:text-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Preferences */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                            <h2 className="text-lg font-semibold text-gray-900">{t('recipeGenerator.preferences')}</h2>

                            {/* Cuisine Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipeGenerator.cuisineType')}</label>
                                <select
                                    value={cuisineType}
                                    onChange={(e) => setCuisineType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    {CUISINES.map(cuisine => (
                                        <option key={cuisine} value={cuisine}>{cuisine}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dietary Restrictions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipeGenerator.dietaryRestrictions')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => toggleDietary(option)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dietaryRestrictions.includes(option)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Servings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('recipeGenerator.servingsLabel', { count: servings })}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="12"
                                    value={servings}
                                    onChange={(e) => setServings(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1</span>
                                    <span>12</span>
                                </div>
                            </div>

                            {/* Cooking Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipeGenerator.cookingTime')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {COOKING_TIMES.map(time => (
                                        <button
                                            key={time.value}
                                            onClick={() => setCookingTime(time.value)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${cookingTime === time.value
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {t(`recipeGenerator.${time.value}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {t('recipeGenerator.generating')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    {t('recipeGenerator.generateRecipe')}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results Section */}
                    <div>
                        {generatedRecipe ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                                {/* Recipe Header */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{generatedRecipe.name}</h2>
                                    <p className="text-gray-600">{generatedRecipe.description}</p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {(generatedRecipe.cuisineType || generatedRecipe.cuisine_type) && (
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                            {generatedRecipe.cuisineType || generatedRecipe.cuisine_type}
                                        </span>
                                        )}
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                                            {generatedRecipe.difficulty}
                                        </span>
                                        {(generatedRecipe.dietaryTags || generatedRecipe.dietary_tags || [])?.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>{(generatedRecipe.prepTime ?? 0) + (generatedRecipe.cookTime ?? 0)} mins</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>{generatedRecipe.servings} servings</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredients */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Ingredients</h3>
                                    <ul className="space-y-2">
                                        {generatedRecipe.ingredients?.map((ing, index) => (
                                            <li key={index} className="flex items-center gap-2 text-gray-700">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                {ing.quantity} {ing.unit} {ing.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Instructions */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
                                    <ol className="space-y-3">
                                        {generatedRecipe.instructions?.map((step, index) => (
                                            <li key={index} className="flex gap-3">
                                                <span className="shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </span>
                                                <span className="text-gray-700 pt-0.5">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                {/* Nutrition */}
                                {generatedRecipe.nutrition && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Nutrition (per serving)</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                            <NutritionBadge label="Calories" value={generatedRecipe.nutrition.calories} unit="kcal" />
                                            <NutritionBadge label="Protein" value={generatedRecipe.nutrition.protein} unit="g" />
                                            <NutritionBadge label="Carbs" value={generatedRecipe.nutrition.carbs} unit="g" />
                                            <NutritionBadge label="Fats" value={generatedRecipe.nutrition.fats} unit="g" />
                                            <NutritionBadge label="Fiber" value={generatedRecipe.nutrition.fiber} unit="g" />
                                        </div>
                                    </div>
                                )}

                                {/* Cooking Tips */}
                                {generatedRecipe.cookingTips && generatedRecipe.cookingTips.length > 0 && (
                                    <div className="bg-emerald-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-emerald-900 mb-2">💡 Cooking Tips</h3>
                                        <ul className="space-y-1">
                                            {generatedRecipe.cookingTips.map((tip, index) => (
                                                <li key={index} className="text-sm text-emerald-800">• {tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Translate */}
                                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
                                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Languages className="w-4 h-4" />
                                        {t('recipeGenerator.translateRecipe')}
                                    </span>
                                    <select
                                        value={translateLanguage}
                                        onChange={(e) => setTranslateLanguage(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                                    >
                                        <option value="vi">{t('recipeGenerator.translateToVietnamese')}</option>
                                        <option value="en">{t('recipeGenerator.translateToEnglish')}</option>
                                    </select>
                                    <button
                                        onClick={handleTranslate}
                                        disabled={translating}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {translating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {t('recipeGenerator.translating')}
                                            </>
                                        ) : (
                                            t('recipeGenerator.translateButton')
                                        )}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={handleSaveRecipe}
                                        disabled={saving}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {saving ? t('recipeGenerator.saving') : t('recipeGenerator.saveRecipe')}
                                    </button>
                                    <button
                                        onClick={() => setGeneratedRecipe(null)}
                                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                    >
                                        {t('recipeGenerator.newRecipe')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
                                <ChefHat className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-gray-500">{t('recipeGenerator.placeholder')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NutritionBadge = ({ label, value, unit }) => (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-lg font-bold text-gray-900">{value}{unit}</div>
        <div className="text-xs text-gray-600">{label}</div>
    </div>
);

export default RecipeGenerator;
