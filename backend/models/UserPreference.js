import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const UserPreference = sequelize.define(
  'UserPreference',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    dietary_restrictions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    allergies: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    preferred_cuisines: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    default_servings: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    measurement_unit: {
      type: DataTypes.STRING(20),
      defaultValue: 'metric',
    },
  },
  {
    tableName: 'user_preferences',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

UserPreference.belongsTo(User, { foreignKey: 'user_id' });

/**
 * Find preferences by user ID
 */
UserPreference.findByUserId = async function (userId) {
  // 1. Lấy bản ghi preference duy nhất của user (1 user – 1 preference)
  return UserPreference.findOne({ where: { user_id: userId } });
};

/**
 * Create or update preferences for a user (upsert)
 */
UserPreference.upsertPreference = async function (userId, updates) {
  // 1. Chỉ lấy các trường được phép cập nhật (whitelist)
  const allowed = [
    'dietary_restrictions',
    'allergies',
    'preferred_cuisines',
    'default_servings',
    'measurement_unit',
  ];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  // 2. Tìm hoặc tạo preference theo user_id; nếu tạo mới thì dùng data làm defaults
  const [preference] = await UserPreference.findOrCreate({
    where: { user_id: userId },
    defaults: { ...data, user_id: userId },
  });

  // 3. Nếu có data cập nhật thì ghi đè lên bản ghi vừa tìm/tạo
  if (Object.keys(data).length > 0) {
    await preference.update(data);
  }

  return preference;
};

/**
 * Update preferences (partial update)
 */
UserPreference.updatePreference = async function (userId, updates) {
  // 1. Tìm preference của user; không có thì trả null
  const pref = await UserPreference.findOne({ where: { user_id: userId } });
  if (!pref) return null;

  // 2. Lọc chỉ các trường cho phép
  const allowed = [
    'dietary_restrictions',
    'allergies',
    'preferred_cuisines',
    'default_servings',
    'measurement_unit',
  ];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  // 3. Cập nhật và trả về preference
  await pref.update(data);
  return pref;
};

export default UserPreference;
