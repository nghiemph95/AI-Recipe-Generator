import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const RecipeIngredient = sequelize.define(
  'RecipeIngredient',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'recipes', key: 'id' },
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
  },
  {
    tableName: 'recipe_ingredients',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default RecipeIngredient;
