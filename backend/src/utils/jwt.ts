import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User.model';

export interface TokenPayload {
  id: string;
  role: UserRole;
  name?: string;
  email?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // In strict production, error out; for local development, require configured secret or dev secret
    return 'agrimart_development_jwt_secret_key_change_in_production';
  }
  return secret;
};

export const generateToken = (payload: TokenPayload, expiresIn: string = '7d'): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
