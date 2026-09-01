// src/modules/routes/routes.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { listRoutes } from './routes.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const mode =
      typeof req.query.mode === 'string' ? req.query.mode : undefined;
    res.json(await listRoutes(mode));
  }),
);

export default router;
