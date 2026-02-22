import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Recipe from './Recipe.js';

const MealPlan = sequelize.define(
  'MealPlan',
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
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'recipes', key: 'id' },
      onDelete: 'CASCADE',
    },
    meal_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    meal_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['breakfast', 'lunch', 'dinner']] },
    },
  },
  {
    tableName: 'meal_plans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

MealPlan.belongsTo(User, { foreignKey: 'user_id' });
MealPlan.belongsTo(Recipe, { foreignKey: 'recipe_id' });

/**
 * Add recipe to meal plan (upsert: same user/date/meal_type → update recipe_id)
 * mealData: { recipe_id, meal_date, meal_type } or { recipe_id, planned_date, meal_type }
 */
MealPlan.createPlan = async function (userId, mealData) {
  // 1. Chuẩn hóa ngày: ưu tiên planned_date hoặc meal_date
  const { recipe_id, planned_date, meal_date, meal_type } = mealData;
  const date = planned_date || meal_date;

  // 2. Tìm hoặc tạo slot (user, ngày, meal_type); nếu tạo mới thì gán recipe_id
  const [plan] = await MealPlan.findOrCreate({
    where: { user_id: userId, meal_date: date, meal_type },
    defaults: { user_id: userId, recipe_id, meal_date: date, meal_type },
  });

  // 3. Nếu đã tồn tại nhưng recipe khác thì cập nhật recipe_id (đổi món cho slot đó)
  if (plan.recipe_id !== recipe_id) {
    await plan.update({ recipe_id });
  }

  return plan;
};

/**
 * Get meal plans in date range with recipe details (breakfast=1, lunch=2, dinner=3 order)
 */
MealPlan.findByDateRange = async function (userId, startDate, endDate) {
  // 1. Lấy tất cả meal plan trong khoảng ngày, sắp theo ngày rồi theo meal_type (breakfast → lunch → dinner)
  const rows = await MealPlan.findAll({
    where: {
      user_id: userId,
      meal_date: { [Op.between]: [startDate, endDate] },
    },
    order: [
      ['meal_date', 'ASC'],
      [sequelize.literal("CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END"), 'ASC'],
    ],
    include: [{ model: Recipe, attributes: ['id', 'name', 'image_url', 'prep_time', 'cook_time'] }],
  });

  // 2. Flatten: mỗi dòng là plan + recipe_name, image_url, prep_time, cook_time (bỏ nested Recipe)
  return rows.map((row) => {
    const plain = row.toJSON();
    const recipe = plain.Recipe || {};
    const { Recipe: _, ...plan } = plain;
    return {
      ...plan,
      recipe_name: recipe.name,
      image_url: recipe.image_url,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
    };
  });
};

/**
 * Get weekly meal plan (7 days: weekStartDate through weekStartDate + 6)
 */
MealPlan.getWeeklyPlan = async function (userId, weekStartDate) {
  // 1. Tính ngày bắt đầu và kết thúc tuần (7 ngày)
  const start = weekStartDate instanceof Date ? weekStartDate.toISOString().slice(0, 10) : weekStartDate;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);
  // 2. Gọi findByDateRange cho khoảng đó
  return MealPlan.findByDateRange(userId, start, endStr);
};

/**
 * Get upcoming meals (from today, next 7 days; default limit 5)
 */
MealPlan.getUpcoming = async function (userId, limit = 5) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Lấy meal plan từ hôm nay trở đi, sắp theo ngày và meal_type, giới hạn limit
  const rows = await MealPlan.findAll({
    where: {
      user_id: userId,
      meal_date: { [Op.gte]: today },
    },
    order: [
      ['meal_date', 'ASC'],
      [sequelize.literal("CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END"), 'ASC'],
    ],
    limit: Math.min(Number(limit) || 5, 50),
    include: [{ model: Recipe, attributes: ['id', 'name', 'image_url'] }],
  });

  // 2. Trả về plan kèm recipe_name, image_url
  return rows.map((row) => {
    const plain = row.toJSON();
    const recipe = plain.Recipe || {};
    const { Recipe: _, ...plan } = plain;
    return {
      ...plan,
      recipe_name: recipe.name,
      image_url: recipe.image_url,
    };
  });
};

/**
 * Get meal plans for a user (optional: startDate, endDate)
 */
MealPlan.findByUserId = async function (userId, options = {}) {
  // 1. Điều kiện: user_id, có thể lọc theo khoảng ngày
  const where = { user_id: userId };
  if (options.startDate || options.endDate) {
    where.meal_date = {};
    if (options.startDate) where.meal_date[Op.gte] = options.startDate;
    if (options.endDate) where.meal_date[Op.lte] = options.endDate;
  }

  // 2. Lấy danh sách kèm recipe (id, name, image_url, cook_time, servings)
  return MealPlan.findAll({
    where,
    order: [['meal_date', 'ASC'], ['meal_type', 'ASC']],
    include: [{ model: Recipe, attributes: ['id', 'name', 'image_url', 'cook_time', 'servings'] }],
  });
};

/**
 * Get meal plan by user and date (single day)
 */
MealPlan.findByUserAndDate = async function (userId, mealDate) {
  // 1. Lấy tất cả bữa trong một ngày (breakfast, lunch, dinner) kèm recipe
  return MealPlan.findAll({
    where: { user_id: userId, meal_date: mealDate },
    order: [['meal_type', 'ASC']],
    include: [{ model: Recipe, attributes: ['id', 'name', 'image_url', 'cook_time', 'servings'] }],
  });
};

/**
 * Get meal plan stats
 */
MealPlan.getStats = async function (userId) {
  // 1. Tính hôm nay và cuối tuần (today + 6 ngày)
  const today = new Date().toISOString().slice(0, 10);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

  // 2. Đếm: tổng meal đã lên kế hoạch, số meal trong tuần này
  const [totalPlannedMeals, thisWeekCount] = await Promise.all([
    MealPlan.count({ where: { user_id: userId } }),
    MealPlan.count({
      where: {
        user_id: userId,
        meal_date: { [Op.between]: [today, endOfWeekStr] },
      },
    }),
  ]);

  return {
    total_planned_meals: Number(totalPlannedMeals),
    this_week_count: Number(thisWeekCount),
  };
};

/**
 * Remove a meal plan entry (scoped to user)
 */
MealPlan.deletePlan = async function (id, userId) {
  // 1. Tìm plan theo id + user_id
  const plan = await MealPlan.findOne({ where: { id, user_id: userId } });
  if (!plan) return null;
  // 2. Lưu bản copy rồi xóa, trả về bản đã xóa
  const deleted = plan.toJSON();
  await plan.destroy();
  return deleted;
};

export default MealPlan;
