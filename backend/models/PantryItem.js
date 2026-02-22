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
 * Get all pantry items for a user (optional filters: category, is_running_low, search)
 */
PantryItem.findByUserId = async function (userId, filters = {}) {
  // 1. Điều kiện: luôn theo user_id
  const where = { user_id: userId };
  if (filters.category) where.category = filters.category;
  if (filters.is_running_low !== undefined) where.is_running_low = filters.is_running_low;
  if (filters.search) {
    where.name = { [Op.iLike]: `%${filters.search}%` };
  }

  // 2. Lấy danh sách, sắp xếp theo tên
  return PantryItem.findAll({ where, order: [['name', 'ASC']] });
};

/**
 * Get a single pantry item by id (scoped to user)
 */
PantryItem.findByIdAndUser = async function (id, userId) {
  // 1. Lấy một item theo id và user_id (đảm bảo user chỉ sửa/xóa item của mình)
  return PantryItem.findOne({ where: { id, user_id: userId } });
};

/**
 * Create a new pantry item
 */
PantryItem.createItem = async function (userId, data) {
  // 1. Gán user_id và tạo bản ghi pantry (name, quantity, unit, category, expiry_date, ...)
  return PantryItem.create({ ...data, user_id: userId });
};

/**
 * Update a pantry item (scoped to user)
 */
PantryItem.updateItem = async function (id, userId, data) {
  // 1. Tìm item theo id + user_id; không có thì trả null
  const item = await PantryItem.findOne({ where: { id, user_id: userId } });
  if (!item) return null;
  // 2. Cập nhật các trường trong data
  await item.update(data);
  return item;
};

/**
 * Delete a pantry item (scoped to user)
 */
PantryItem.deleteItem = async function (id, userId) {
  // 1. Tìm item theo id + user_id
  const item = await PantryItem.findOne({ where: { id, user_id: userId } });
  if (!item) return false;
  // 2. Xóa bản ghi
  await item.destroy();
  return true;
};

/**
 * Get items expiring within N days
 */
PantryItem.findExpiringSoon = async function (userId, days = 7) {
  // 1. Tính khoảng ngày: từ hôm nay đến hôm nay + days
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  // 2. Lấy item có expiry_date trong khoảng, sắp theo ngày hết hạn
  return PantryItem.findAll({
    where: {
      user_id: userId,
      expiry_date: { [Op.between]: [today, future] },
    },
    order: [['expiry_date', 'ASC']],
  });
};

/**
 * Get pantry stats for a user
 */
PantryItem.getStats = async function (userId) {
  // 1. Chuẩn hóa ngày: hôm nay 00:00 và +7 ngày (để đếm “sắp hết hạn”)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  // 2. Đếm song song: tổng item, số category, running low, sắp hết hạn trong 7 ngày
  const [totalItems, totalCategories, runningLowCount, expiringSoonCount] = await Promise.all([
    PantryItem.count({ where: { user_id: userId } }),
    PantryItem.count({
      where: { user_id: userId },
      distinct: true,
      col: 'category',
    }),
    PantryItem.count({
      where: { user_id: userId, is_running_low: true },
    }),
    PantryItem.count({
      where: {
        user_id: userId,
        expiry_date: { [Op.between]: [today, in7Days] },
      },
    }),
  ]);

  // 3. Trả về object thống kê
  return {
    total_items: Number(totalItems),
    total_categories: Number(totalCategories),
    running_low_count: Number(runningLowCount),
    expiring_soon_count: Number(expiringSoonCount),
  };
};

export default PantryItem;
