// src/modules/mapid-sync/mapid-sync.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { syncAll } from './mapid-sync.service.js';

const router = Router();

router.post(
  '/sync-mapid',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await syncAll();
    res.json({ message: 'Sinkronisasi selesai', ...result });
  }),
);

export default router;
