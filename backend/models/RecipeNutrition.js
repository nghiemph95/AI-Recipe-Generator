import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const RecipeNutrition = sequelize.define(
  'RecipeNutrition',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'recipes', key: 'id' },
      onDelete: 'CASCADE',
    },
    calories: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    protein: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    carbs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    fats: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    fiber: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    tableName: 'recipe_nutrition',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default RecipeNutrition;
