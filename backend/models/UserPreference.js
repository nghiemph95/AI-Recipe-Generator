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
  return UserPreference.findOne({ where: { user_id: userId } });
};

/**
 * Create or update preferences for a user (upsert)
 */
UserPreference.upsertPreference = async function (userId, updates) {
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

  const [preference] = await UserPreference.findOrCreate({
    where: { user_id: userId },
    defaults: { ...data, user_id: userId },
  });

  if (Object.keys(data).length > 0) {
    await preference.update(data);
  }

  return preference;
};

/**
 * Update preferences (partial update)
 */
UserPreference.updatePreference = async function (userId, updates) {
  const pref = await UserPreference.findOne({ where: { user_id: userId } });
  if (!pref) return null;

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

  await pref.update(data);
  return pref;
};

export default UserPreference;
