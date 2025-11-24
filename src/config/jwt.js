import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  expiresIn: process.env.JWT_EXPIRE || '24h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  algorithm: 'HS256',
};

export default jwtConfig;
