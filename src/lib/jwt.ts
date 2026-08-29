import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET belum diset di .env');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

const authPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
});

export type AuthPayload = z.infer<typeof authPayloadSchema>;

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  '8h') as SignOptions['expiresIn'];

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  // .parse() menerima unknown, jadi sekaligus lolos dari overload jwt.verify
  // yang berantakan DAN memvalidasi bentuk payload saat runtime.
  return authPayloadSchema.parse(decoded);
}
