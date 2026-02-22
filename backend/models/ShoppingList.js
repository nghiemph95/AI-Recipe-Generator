import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import MealPlan from './MealPlan.js';
import Recipe from './Recipe.js';
import RecipeIngredient from './RecipeIngredient.js';
import PantryItem from './PantryItem.js';

const ShoppingListItem = sequelize.define(
  'ShoppingListItem',
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
    ingredient_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    is_checked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    from_meal_plan: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'shopping_list_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

ShoppingListItem.belongsTo(User, { foreignKey: 'user_id' });

/**
 * Add manual item to shopping list
 * itemData: { ingredient_name, quantity, unit, category? }
 */
ShoppingListItem.createItem = async function (userId, itemData) {
  // 1. Gán category mặc định nếu không có; đánh dấu from_meal_plan = false (thêm tay)
  const { ingredient_name, quantity, unit, category = 'Uncategorized' } = itemData;
  return ShoppingListItem.create({
    user_id: userId,
    ingredient_name,
    quantity,
    unit,
    category,
    from_meal_plan: false,
  });
};

/**
 * Update shopping list item (partial update; scoped to user)
 * updates: { ingredient_name?, quantity?, unit?, category?, is_checked? }
 */
ShoppingListItem.updateItem = async function (id, userId, updates) {
  // 1. Tìm item theo id + user_id
  const item = await ShoppingListItem.findOne({ where: { id, user_id: userId } });
  if (!item) return null;

  // 2. Chỉ cập nhật các trường cho phép
  const allowed = ['ingredient_name', 'quantity', 'unit', 'category', 'is_checked'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  if (Object.keys(data).length === 0) return item;

  await item.update(data);
  return item;
};

/**
 * Toggle item checked status
 */
ShoppingListItem.toggleChecked = async function (id, userId) {
  // 1. Tìm item theo id + user_id; không có thì trả null
  const item = await ShoppingListItem.findOne({ where: { id, user_id: userId } });
  if (!item) return null;
  // 2. Đảo trạng thái is_checked (true ↔ false)
  await item.update({ is_checked: !item.is_checked });
  return item;
};

/**
 * Delete shopping list item
 */
ShoppingListItem.delete = async function (id, userId) {
  // 1. Tìm item theo id + user_id; không có thì trả null
  const item = await ShoppingListItem.findOne({ where: { id, user_id: userId } });
  if (!item) return null;
  // 2. Xóa bản ghi, trả về instance đã xóa
  await item.destroy();
  return item;
};

/**
 * Clear entire shopping list for a user
 */
ShoppingListItem.clearAll = async function (userId) {
  // 1. Lấy toàn bộ item của user (để trả về)
  const items = await ShoppingListItem.findAll({ where: { user_id: userId } });
  const rows = items.map((i) => i.toJSON());
  // 2. Xóa hết item của user
  await ShoppingListItem.destroy({ where: { user_id: userId } });
  return rows;
};

/**
 * Move checked items to pantry, then remove them from shopping list
 */
ShoppingListItem.addCheckedToPantry = async function (userId) {
  const t = await sequelize.transaction();
  try {
    // 1. Lấy tất cả item đã check (is_checked = true) của user
    const checkedItems = await ShoppingListItem.findAll({
      where: { user_id: userId, is_checked: true },
      transaction: t,
    });
    const rows = checkedItems.map((i) => i.toJSON());

    // 2. Với mỗi item: tạo bản ghi pantry (name = ingredient_name, quantity, unit, category)
    for (const item of checkedItems) {
      await PantryItem.create(
        {
          user_id: userId,
          name: item.ingredient_name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category ?? 'Uncategorized',
        },
        { transaction: t }
      );
    }

    // 3. Xóa các item đã check khỏi shopping list
    await ShoppingListItem.destroy({
      where: { user_id: userId, is_checked: true },
      transaction: t,
    });

    await t.commit();
    return rows;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Get all shopping list items for a user
 */
ShoppingListItem.findByUserId = async function (userId) {
  // 1. Lấy tất cả item của user, sắp theo category rồi tên nguyên liệu
  return ShoppingListItem.findAll({
    where: { user_id: userId },
    order: [['category', 'ASC'], ['ingredient_name', 'ASC']],
  });
};

/**
 * Get shopping list grouped by category
 * Returns [{ category, items: [{ id, ingredient_name, quantity, unit, is_checked, from_meal_plan }] }]
 */
ShoppingListItem.getGroupedByCategory = async function (userId) {
  // 1. Lấy toàn bộ item, sắp theo category và tên
  const rows = await ShoppingListItem.findAll({
    where: { user_id: userId },
    order: [['category', 'ASC'], ['ingredient_name', 'ASC']],
  });

  // 2. Nhóm theo category (Map: category → mảng item), category null → 'Uncategorized'
  const grouped = new Map();
  for (const row of rows) {
    const plain = row.toJSON();
    const cat = plain.category ?? 'Uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push({
      id: plain.id,
      ingredient_name: plain.ingredient_name,
      quantity: plain.quantity,
      unit: plain.unit,
      is_checked: plain.is_checked,
      from_meal_plan: plain.from_meal_plan,
    });
  }

  // 3. Trả về mảng { category, items }
  return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
};

/**
 * Generate shopping list from meal plan (date range).
 * Removes existing from_meal_plan items, aggregates recipe ingredients, subtracts pantry, inserts new items.
 */
ShoppingListItem.generateFromMealPlan = async function (userId, startDate, endDate) {
  const t = await sequelize.transaction();

  try {
    // 1. Xóa toàn bộ item có nguồn từ meal plan (from_meal_plan = true) để tính lại từ đầu
    await ShoppingListItem.destroy({
      where: { user_id: userId, from_meal_plan: true },
      transaction: t,
    });

    // 2. Lấy meal plan trong khoảng ngày, kèm Recipe và RecipeIngredient
    const plans = await MealPlan.findAll({
      where: {
        user_id: userId,
        meal_date: { [Op.between]: [startDate, endDate] },
      },
      include: [{ model: Recipe, include: [RecipeIngredient] }],
      transaction: t,
    });

    // 3. Gộp lượng nguyên liệu theo (tên + unit): cùng tên+unit thì cộng quantity
    const agg = new Map();
    for (const plan of plans) {
      const recipe = plan.Recipe;
      if (!recipe?.RecipeIngredients) continue;
      for (const ri of recipe.RecipeIngredients) {
        const key = `${String(ri.ingredient_name).toLowerCase()}_${ri.unit}`;
        const qty = parseFloat(ri.quantity) || 0;
        const existing = agg.get(key);
        if (existing) {
          existing.quantity += qty;
        } else {
          agg.set(key, { ingredient_name: ri.ingredient_name, unit: ri.unit, quantity: qty });
        }
      }
    }

    // 4. Lấy tồn kho pantry (name, quantity, unit) để trừ bớt lượng cần mua
    const pantryRows = await PantryItem.findAll({
      where: { user_id: userId },
      attributes: ['name', 'quantity', 'unit'],
      transaction: t,
    });
    const pantryMap = new Map();
    for (const item of pantryRows) {
      const key = `${String(item.name).toLowerCase()}_${item.unit}`;
      pantryMap.set(key, parseFloat(item.quantity) || 0);
    }

    // 5. Với mỗi nguyên liệu đã gộp: cần mua = max(0, tổng cần - tồn pantry); chỉ thêm item nếu cần mua > 0
    for (const [, ing] of agg) {
      const key = `${String(ing.ingredient_name).toLowerCase()}_${ing.unit}`;
      const pantryQty = pantryMap.get(key) || 0;
      const neededQty = Math.max(0, ing.quantity - pantryQty);
      if (neededQty > 0) {
        await ShoppingListItem.create(
          {
            user_id: userId,
            ingredient_name: ing.ingredient_name,
            quantity: neededQty,
            unit: ing.unit,
            from_meal_plan: true,
            category: 'Uncategorized',
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    // 6. Trả về toàn bộ shopping list của user (sau khi đã thêm item từ meal plan)
    return ShoppingListItem.findByUserId(userId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export default ShoppingListItem;
