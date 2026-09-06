// src/modules/chat/chat.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../middleware/async-handler.js';
import { askChat } from './chat.service.js';

const router = Router();

const askSchema = z.object({
  message: z.string().min(1).max(1000),
  stationSlug: z.string().optional(),
  fromSlug: z.string().optional(),
  toSlug: z.string().optional(),
});

// 20 request / 10 menit per IP — cukup longgar untuk percakapan wajar,
// ketat cukup untuk mencegah script yang menghajar endpoint berbayar ini.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan, coba lagi beberapa menit lagi.',
  },
});

router.post(
  '/',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: 'Input tidak valid', issues: parsed.error.issues });
    }
    const result = await askChat(
      parsed.data.message,
      parsed.data.stationSlug,
      parsed.data.fromSlug,
      parsed.data.toSlug,
    );
    res.json(result);
  }),
);

export default router;
