import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-do-not-use-in-production',
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',
  saltRounds: 12,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
};
