import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthPayload } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.galigo_token;
  if (!token) {
    return res.status(401).json({ message: 'Belum login' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res
      .status(401)
      .json({ message: 'Sesi tidak valid atau kedaluwarsa' });
  }
}
