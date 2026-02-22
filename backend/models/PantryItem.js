import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const PantryItem = sequelize.define(
  'PantryItem',
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
      allowNull: false,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_running_low: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'pantry_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

PantryItem.belongsTo(User, { foreignKey: 'user_id' });

/**
 * Get all pantry items for a user (optional filters: category, is_running_low)
 */
PantryItem.findByUserId = async function (userId, filters = {}) {
  const where = { user_id: userId };

  if (filters.category) where.category = filters.category;
  if (filters.is_running_low !== undefined) where.is_running_low = filters.is_running_low;

  return PantryItem.findAll({ where, order: [['name', 'ASC']] });
};

/**
 * Get a single pantry item by id (scoped to user)
 */
PantryItem.findByIdAndUser = async function (id, userId) {
  return PantryItem.findOne({ where: { id, user_id: userId } });
};

/**
 * Create a new pantry item
 */
PantryItem.createItem = async function (userId, data) {
  return PantryItem.create({ ...data, user_id: userId });
};

/**
 * Update a pantry item (scoped to user)
 */
PantryItem.updateItem = async function (id, userId, data) {
  const item = await PantryItem.findOne({ where: { id, user_id: userId } });
  if (!item) return null;
  await item.update(data);
  return item;
};

/**
 * Delete a pantry item (scoped to user)
 */
PantryItem.deleteItem = async function (id, userId) {
  const item = await PantryItem.findOne({ where: { id, user_id: userId } });
  if (!item) return false;
  await item.destroy();
  return true;
};

/**
 * Get items expiring within N days
 */
PantryItem.findExpiringSoon = async function (userId, days = 7) {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  return PantryItem.findAll({
    where: {
      user_id: userId,
      expiry_date: { [Op.between]: [today, future] },
    },
    order: [['expiry_date', 'ASC']],
  });
};

export default PantryItem;
