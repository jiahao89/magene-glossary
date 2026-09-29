import { FastifyRequest, FastifyReply } from 'fastify';
import { TermService } from './term.service.js';
import {
  CreateTermSchema,
  QueryTermsSchema,
  UpdateTermSchema,
  UpsertTranslationSchema,
} from './term.schema.js';

export class TermController {
  constructor(private service: TermService) {}

  async createTerm(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateTermSchema.parse(request.body);
    const operator = request.userContext?.operatorName || 'System';
    const term = await this.service.createTerm(body, operator);
    return reply.status(201).send(term);
  }

  async getTerm(request: FastifyRequest<{ Params: { termId: string } }>, reply: FastifyReply) {
    const { termId } = request.params;
    const term = await this.service.getTermById(termId);
    return reply.send(term);
  }

  async updateTerm(request: FastifyRequest<{ Params: { termId: string } }>, reply: FastifyReply) {
    const { termId } = request.params;
    const body = UpdateTermSchema.parse(request.body);
    const operator = request.userContext?.operatorName || 'System';
    const updated = await this.service.updateTerm(termId, body, operator);
    return reply.send(updated);
  }

  async deleteTerm(request: FastifyRequest<{ Params: { termId: string } }>, reply: FastifyReply) {
    const { termId } = request.params;
    const deleted = await this.service.deleteTerm(termId);
    return reply.send({ success: true, deletedId: deleted.id });
  }

  async upsertTranslation(
    request: FastifyRequest<{ Params: { termId: string; lang: string } }>,
    reply: FastifyReply
  ) {
    const { termId, lang } = request.params;
    const body = UpsertTranslationSchema.parse({
      ...((request.body as object) || {}),
      languageCode: lang,
    });
    const operator = request.userContext?.operatorName || 'System';
    const translation = await this.service.upsertTranslation(termId, body, operator);
    return reply.send(translation);
  }

  async listTerms(
    request: FastifyRequest<{ Params: { versionId: string } }>,
    reply: FastifyReply
  ) {
    const { versionId } = request.params;
    const query = QueryTermsSchema.parse(request.query);
    const result = await this.service.listTerms(versionId, query);
    return reply.send(result);
  }
}
