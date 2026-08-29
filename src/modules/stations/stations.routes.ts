// src/modules/stations/stations.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { listStations, getStationBySlug } from './stations.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listStations());
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const station = await getStationBySlug(req.params.slug);
    if (!station) {
      return res.status(404).json({ message: 'Stasiun tidak ditemukan' });
    }
    res.json(station);
  }),
);

export default router;
