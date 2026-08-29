import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/jwt.js';

export class AuthServiceError extends Error {}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AuthServiceError('Email atau password salah');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthServiceError('Email atau password salah');

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}
