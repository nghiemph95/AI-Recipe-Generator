import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import RecipeIngredient from './RecipeIngredient.js';
import RecipeNutrition from './RecipeNutrition.js';

const Recipe = sequelize.define(
  'Recipe',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cuisine_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.STRING(20),
      defaultValue: 'medium',
    },
    prep_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cook_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    servings: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    instructions: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    dietary_tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    user_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'recipes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Recipe.belongsTo(User, { foreignKey: 'user_id' });
Recipe.hasMany(RecipeIngredient, { foreignKey: 'recipe_id' });
Recipe.hasOne(RecipeNutrition, { foreignKey: 'recipe_id' });

/**
 * Get recipes for a user with filters, sorting, pagination, and calories
 * filters: { search?, cuisine_type?, difficulty?, dietary_tag?, max_cook_time?, sort_by?, sort_order?, limit?, offset? }
 */
Recipe.findByUserId = async function (userId, filters = {}) {
  // 1. Xây điều kiện where: user_id + search (name/description), cuisine_type, difficulty, dietary_tag, max_cook_time
  const where = { user_id: userId };
  if (filters.search) {
    const term = `%${filters.search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }
  if (filters.cuisine_type) where.cuisine_type = filters.cuisine_type;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.dietary_tag) {
    where.dietary_tags = { [Op.contains]: [filters.dietary_tag] };
  }
  if (filters.max_cook_time != null) {
    where.cook_time = { [Op.lte]: filters.max_cook_time };
  }

  // 2. Chuẩn hóa sort, limit, offset (whitelist sort field, cap limit)
  const allowedSort = ['created_at', 'updated_at', 'name', 'cook_time', 'prep_time', 'servings'];
  const sortBy = allowedSort.includes(filters.sort_by) ? filters.sort_by : 'created_at';
  const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(Number(filters.limit) || 20, 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  // 3. Query recipe + nutrition (calories), phân trang
  const rows = await Recipe.findAll({
    where,
    order: [[sortBy, sortOrder]],
    limit,
    offset,
    include: [
      { model: RecipeNutrition, required: false, attributes: ['calories'] },
    ],
  });

  // 4. Trả về danh sách recipe với calories gộp vào (bỏ nested RecipeNutrition)
  return rows.map((r) => {
    const plain = r.toJSON();
    const calories = plain.RecipeNutrition?.calories ?? null;
    const { RecipeNutrition: _, ...recipe } = plain;
    return { ...recipe, calories };
  });
};

/**
 * Get recent recipes for a user (with calories)
 */
Recipe.getRecent = async function (userId, limit = 5) {
  // 1. Lấy recipe mới nhất theo created_at, có kèm calories
  const rows = await Recipe.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: Math.min(Number(limit) || 5, 50),
    include: [
      { model: RecipeNutrition, required: false, attributes: ['calories'] },
    ],
  });

  // 2. Flatten: recipe + calories (bỏ nested RecipeNutrition)
  return rows.map((r) => {
    const plain = r.toJSON();
    const calories = plain.RecipeNutrition?.calories ?? null;
    const { RecipeNutrition: _, ...recipe } = plain;
    return { ...recipe, calories };
  });
};

/**
 * Get recipe stats for a user
 */
Recipe.getStats = async function (userId) {
  // 1. Đếm song song: tổng recipe, số cuisine_type khác nhau, AVG(cook_time)
  const [totalRecipes, cuisineTypesCount, avgResult] = await Promise.all([
    Recipe.count({ where: { user_id: userId } }),
    Recipe.count({
      where: { user_id: userId },
      distinct: true,
      col: 'cuisine_type',
    }),
    Recipe.findOne({
      where: { user_id: userId },
      attributes: [[sequelize.fn('AVG', sequelize.col('cook_time')), 'avg_cook_time']],
      raw: true,
    }),
  ]);

  const avgCookTime = avgResult?.avg_cook_time != null ? Number(avgResult.avg_cook_time) : null;

  // 2. Trả object thống kê
  return {
    total_recipes: Number(totalRecipes),
    cuisine_types_count: Number(cuisineTypesCount),
    avg_cook_time: avgCookTime,
  };
};

/**
 * Get a single recipe by id (scoped to user)
 */
Recipe.findByIdAndUser = async function (id, userId) {
  // 1. Lấy một recipe theo id và user_id (không kèm ingredients/nutrition)
  return Recipe.findOne({ where: { id, user_id: userId } });
};

/**
 * Get recipe by id with ingredients and nutrition (scoped to user)
 * Returns { ...recipe, ingredients: [{ name, quantity, unit }], nutrition: {...} | null }
 */
Recipe.findById = async function (id, userId) {
  // 1. Lấy recipe kèm RecipeIngredient và RecipeNutrition
  const recipe = await Recipe.findOne({
    where: { id, user_id: userId },
    include: [
      { model: RecipeIngredient, attributes: ['ingredient_name', 'quantity', 'unit'] },
      { model: RecipeNutrition, required: false, attributes: ['calories', 'protein', 'carbs', 'fats', 'fiber'] },
    ],
  });

  if (!recipe) return null;

  // 2. Chuyển sang plain object: ingredients (name/quantity/unit), nutrition object
  const plain = recipe.toJSON();
  const ingredients = (plain.RecipeIngredients || []).map((ing) => ({
    name: ing.ingredient_name,
    quantity: ing.quantity,
    unit: ing.unit,
  }));
  const nutrition = plain.RecipeNutrition
    ? {
        calories: plain.RecipeNutrition.calories,
        protein: plain.RecipeNutrition.protein,
        carbs: plain.RecipeNutrition.carbs,
        fats: plain.RecipeNutrition.fats,
        fiber: plain.RecipeNutrition.fiber,
      }
    : null;

  const { RecipeIngredients, RecipeNutrition, ...recipeData } = plain;
  return { ...recipeData, ingredients, nutrition };
};

/**
 * Create a new recipe with ingredients and nutrition (transaction)
 * recipeData: { name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions, dietary_tags?, user_notes?, image_url?, ingredients?: [{ name, quantity, unit }], nutrition?: { calories, protein, carbs, fats, fiber } }
 */
Recipe.createRecipe = async function (userId, recipeData) {
  const {
    name,
    description,
    cuisine_type,
    difficulty,
    prep_time,
    cook_time,
    servings,
    instructions,
    dietary_tags = [],
    user_notes,
    image_url,
    ingredients = [],
    nutrition = {},
  } = recipeData;

  const t = await sequelize.transaction();

  try {
    // 1. Tạo bản ghi recipe chính (trong transaction)
    const recipe = await Recipe.create(
      {
        user_id: userId,
        name,
        description,
        cuisine_type,
        difficulty,
        prep_time,
        cook_time,
        servings,
        instructions,
        dietary_tags,
        user_notes,
        image_url,
      },
      { transaction: t }
    );

    // 2. Nếu có ingredients thì bulkCreate recipe_ingredients (liên kết recipe_id)
    if (ingredients.length > 0) {
      await RecipeIngredient.bulkCreate(
        ingredients.map((ing) => ({
          recipe_id: recipe.id,
          ingredient_name: ing.name ?? ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
        { transaction: t }
      );
    }

    // 3. Nếu có nutrition thì tạo recipe_nutrition (1-1 với recipe)
    if (nutrition && Object.keys(nutrition).length > 0) {
      await RecipeNutrition.create(
        {
          recipe_id: recipe.id,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fats: nutrition.fats,
          fiber: nutrition.fiber,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // 4. Trả về recipe đầy đủ (kèm ingredients + nutrition) sau khi commit
    return Recipe.findByPk(recipe.id, {
      include: [
        { model: RecipeIngredient, attributes: ['id', 'ingredient_name', 'quantity', 'unit'] },
        { model: RecipeNutrition, required: false },
      ],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Update recipe (partial update: only provided fields are changed)
 * updates: { name?, description?, cuisine_type?, difficulty?, prep_time?, cook_time?, servings?, instructions?, dietary_tags?, user_notes?, image_url? }
 */
Recipe.updateRecipe = async function (id, userId, updates) {
  // 1. Tìm recipe theo id + user_id
  const recipe = await Recipe.findOne({ where: { id, user_id: userId } });
  if (!recipe) return null;

  // 2. Chỉ cập nhật các trường cho phép (whitelist)
  const allowed = [
    'name',
    'description',
    'cuisine_type',
    'difficulty',
    'prep_time',
    'cook_time',
    'servings',
    'instructions',
    'dietary_tags',
    'user_notes',
    'image_url',
  ];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  if (Object.keys(data).length === 0) return recipe;

  // 3. Cập nhật và trả về recipe (không đụng ingredients/nutrition)
  await recipe.update(data);
  return recipe;
};

/**
 * Delete recipe (scoped to user). Returns the deleted recipe or null.
 */
Recipe.deleteRecipe = async function (id, userId) {
  // 1. Tìm recipe theo id + user_id
  const recipe = await Recipe.findOne({ where: { id, user_id: userId } });
  if (!recipe) return null;
  // 2. Lưu bản copy (để trả về) rồi xóa (CASCADE xóa ingredients + nutrition)
  const deleted = recipe.toJSON();
  await recipe.destroy();
  return deleted;
};

export default Recipe;
