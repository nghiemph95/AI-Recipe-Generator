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
  // 1. Mã hóa mật khẩu trước khi lưu (bcrypt, 10 rounds)
  const password_hash = await bcrypt.hash(password, 10);
  // 2. Tạo bản ghi user trong DB với email, password_hash, name
  const user = await User.create({ email, password_hash, name });
  return user;
};

/**
 * Find user by email
 */
User.findByEmail = async function (email) {
  // 1. Tìm một user theo email (dùng cho login / kiểm tra trùng)
  return User.findOne({ where: { email } });
};

/**
 * Find user by ID (excludes password_hash by default)
 */
User.findById = async function (id) {
  // 1. Lấy user theo PK, loại trừ password_hash để không trả về client
  return User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });
};

/**
 * Update user (partial update for name, email)
 */
User.updateUser = async function (id, updates) {
  // 1. Chỉ cho phép cập nhật name, email (whitelist)
  const { name, email } = updates;
  const allowed = {};
  if (name !== undefined) allowed.name = name;
  if (email !== undefined) allowed.email = email;
  // 2. Cập nhật DB
  await User.update(allowed, { where: { id } });
  // 3. Trả về user đã cập nhật (không có password_hash)
  return User.findByPk(id, { attributes: { exclude: ['password_hash'] } });
};

/**
 * Update password
 */
User.updatePassword = async function (id, newPassword) {
  // 1. Băm mật khẩu mới
  const password_hash = await bcrypt.hash(newPassword, 10);
  // 2. Cập nhật password_hash cho user
  await User.update({ password_hash }, { where: { id } });
};

/**
 * Verify password
 */
User.verifyPassword = async function (plainPassword, hashedPassword) {
  // 1. So sánh mật khẩu gửi lên với hash lưu trong DB (login)
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Delete user
 */
User.deleteUser = async function (id) {
  // 1. Xóa bản ghi user (CASCADE sẽ xóa preferences, pantry, recipes, meal plans, shopping list)
  await User.destroy({ where: { id } });
};

export default User;
