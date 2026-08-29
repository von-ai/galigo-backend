// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import stationsRoutes from './modules/stations/stations.routes.js';
import poiRoutes from './modules/poi/poi.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/stations', stationsRoutes);
app.use('/poi', poiRoutes);

// Selalu paling akhir — menangkap semua error yang lolos dari asyncHandler.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  },
);

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`galigo-backend jalan di http://localhost:${port}`);
});
