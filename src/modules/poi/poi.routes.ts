// src/modules/poi/poi.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/async-handler.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { listPoi, createManualPoi } from './poi.service.js';

const router = Router();

const CATEGORIES = [
  'makan',
  'musholla',
  'atm',
  'toilet',
  'umkm',
  'wisata',
] as const;

const createPoiSchema = z.object({
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  stationId: z.string().uuid().optional(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  address: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const category =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    res.json(await listPoi(category));
  }),
);

// Guarded — dipakai admin Dishub untuk input POI manual sampai sync MAPID siap.
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createPoiSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: 'Input tidak valid', issues: parsed.error.issues });
    }
    const result = await createManualPoi(parsed.data);
    res.status(201).json(result);
  }),
);

export default router;
