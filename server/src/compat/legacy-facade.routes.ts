import { FastifyInstance } from 'fastify';
import { LegacyTermController } from './legacy-term.controller.js';
import { TermService } from '../modules/term/term.service.js';
import { TermRepository } from '../modules/term/term.repository.js';
import { initDatabase } from '../common/database/db.client.js';

export async function legacyFacadeRoutes(app: FastifyInstance) {
  const { db } = await initDatabase();
  const repo = new TermRepository(db);
  const service = new TermService(repo);
  const controller = new LegacyTermController(service, db);

  // 1. POST /api/tables/:tableId/sync
  app.post('/api/tables/:tableId/sync', controller.handleSync.bind(controller));

  // 2. POST /api/sync-table
  app.post('/api/sync-table', controller.handleSync.bind(controller));

  // 3. GET /api/tables/:tableId/terms
  app.get('/api/tables/:tableId/terms', controller.handleGetTerms.bind(controller));
}
