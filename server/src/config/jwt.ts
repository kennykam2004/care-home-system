import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from './index.js';

export interface TokenPayload {
  userId: string;
  employeeId: string;
  name: string;
  roles: string[];
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, config.jwtSecret, options);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
};
