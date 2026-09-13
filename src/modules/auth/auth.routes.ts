// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { login, AuthServiceError } from './auth.service.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: 'Input tidak valid', issues: parsed.error.issues });
    }

    try {
      const { token, user } = await login(
        parsed.data.email,
        parsed.data.password,
      );
      res.json({ token, user });
    } catch (err) {
      if (err instanceof AuthServiceError) {
        return res.status(401).json({ message: err.message });
      }
      throw err;
    }
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  }),
);

router.post('/logout', (_req, res) => {
  // Stateless JWT — tidak ada yang perlu di-invalidate di server.
  // Client yang hapus token dari localStorage-nya sendiri.
  res.json({ ok: true });
});

export default router;
