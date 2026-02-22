import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully (Neon Postgres)');
  } catch (error) {
    console.error('Unable to connect to database:', error.message);
    throw error;
  }
}

export default sequelize;
