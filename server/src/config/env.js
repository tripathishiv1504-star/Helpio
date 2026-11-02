import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = Object.freeze({
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/helpio',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-helpio',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@helpio.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123!',
  SEED_CENTER_LAT: parseFloat(process.env.SEED_CENTER_LAT || '28.6139'),
  SEED_CENTER_LNG: parseFloat(process.env.SEED_CENTER_LNG || '77.2090'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'simulated',
  isDev: process.env.NODE_ENV !== 'production',
  isTest: process.env.NODE_ENV === 'test',
});

export default env;
