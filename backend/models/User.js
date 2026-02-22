import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

/**
 * Create a new user (hash password before save)
 */
User.createUser = async function ({ email, password, name }) {
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash, name });
  return user;
};

/**
 * Find user by email
 */
User.findByEmail = async function (email) {
  return User.findOne({ where: { email } });
};

/**
 * Find user by ID (excludes password_hash by default)
 */
User.findById = async function (id) {
  return User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });
};

/**
 * Update user (partial update for name, email)
 */
User.updateUser = async function (id, updates) {
  const { name, email } = updates;
  const allowed = {};
  if (name !== undefined) allowed.name = name;
  if (email !== undefined) allowed.email = email;
  await User.update(allowed, { where: { id } });
  return User.findByPk(id, { attributes: { exclude: ['password_hash'] } });
};

/**
 * Update password
 */
User.updatePassword = async function (id, newPassword) {
  const password_hash = await bcrypt.hash(newPassword, 10);
  await User.update({ password_hash }, { where: { id } });
};

/**
 * Verify password
 */
User.verifyPassword = async function (plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Delete user
 */
User.deleteUser = async function (id) {
  await User.destroy({ where: { id } });
};

export default User;
