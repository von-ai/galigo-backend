// src/modules/insights/insights.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  getStats,
  getLatestSummary,
  regenerateSummary,
  InsightsError,
} from './insight.service.js';

const router = Router();

// Satu baris ini menjaga SELURUH route di bawahnya — lebih aman daripada
// menempel requireAuth di tiap route satu-satu (gampang kelewat kalau nanti
// nambah endpoint baru dan lupa nempelin guard-nya).
router.use(requireAuth);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await getStats());
  }),
);

router.get(
  '/summary/:corridorSlug',
  asyncHandler(async (req, res) => {
    const summary = await getLatestSummary(req.params.corridorSlug);
    res.json(summary); // null kalau belum pernah di-generate — frontend tampilkan state kosong
  }),
);

router.post(
  '/summary/:corridorSlug/regenerate',
  asyncHandler(async (req, res) => {
    try {
      const summary = await regenerateSummary(req.params.corridorSlug);
      res.status(201).json(summary);
    } catch (err) {
      if (err instanceof InsightsError) {
        return res.status(409).json({ message: err.message });
      }
      throw err;
    }
  }),
);

export default router;
