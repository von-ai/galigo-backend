// src/middleware/async-handler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 tidak menangkap rejected promise dari async handler secara
// otomatis — tanpa ini, error di dalam handler async bikin request
// menggantung sampai client timeout, bukan langsung dapat response 500.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
