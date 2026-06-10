import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { pairsRouter } from './routes/pairs.js';
import { leinRouter } from './routes/lein.js';
import { contrastRouter } from './routes/contrast.js';
import { sugyotRouter } from './routes/sugyot.js';
import { classesRouter } from './routes/classes.js';
import { mcRouter } from './routes/mc.js';
import { reviewRouter } from './routes/review.js';
import { visualRouter } from './routes/visual.js';
import { adminRouter } from './routes/admin.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', sessionRouter);
  app.use('/api', pairsRouter);
  app.use('/api', leinRouter);
  app.use('/api', contrastRouter);
  app.use('/api', sugyotRouter);
  app.use('/api', classesRouter);
  app.use('/api', mcRouter);
  app.use('/api', reviewRouter);
  app.use('/api', visualRouter);
  app.use('/api', adminRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal error', details: err.message });
  });

  return app;
}
