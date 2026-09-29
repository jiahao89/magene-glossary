import { FastifyRequest, FastifyReply } from 'fastify';
import { DiffService, DiffCompareParams } from './diff.service.js';
import { ApplyDiffService, ApplyDiffPayload } from './apply-diff.service.js';
import { ExcelDiffExporter } from '../export/excel-diff-exporter.js';
import { ValidationError } from '../../common/errors/domain-errors.js';

export class DiffController {
  constructor(
    private diffService: DiffService,
    private applyDiffService: ApplyDiffService
  ) {}

  async compareVersions(
    req: FastifyRequest<{
      Querystring: {
        baseVersionId: string;
        targetVersionId: string;
        onlyLang?: string;
        hideFalseDiff?: string | boolean;
      };
    }>,
    reply: FastifyReply
  ) {
    const { baseVersionId, targetVersionId, onlyLang, hideFalseDiff } = req.query;
    if (!baseVersionId || !targetVersionId) {
      throw new ValidationError('必须同时提供基准版本 baseVersionId 与目标版本 targetVersionId');
    }

    const isHide = hideFalseDiff === undefined ? true : String(hideFalseDiff) === 'true';

    const result = await this.diffService.compareVersions({
      baseVersionId,
      targetVersionId,
      onlyLang,
      hideFalseDiff: isHide,
    });

    return reply.status(200).send(result);
  }

  async applyDiff(
    req: FastifyRequest<{
      Body: ApplyDiffPayload;
    }>,
    reply: FastifyReply
  ) {
    const payload = req.body;
    if (!payload.sourceVersionId || !payload.targetVersionId) {
      throw new ValidationError('必须提供源版本 sourceVersionId 与目标版本 targetVersionId');
    }
    if (!payload.selectedKws || !Array.isArray(payload.selectedKws)) {
      throw new ValidationError('selectedKws 必须为选中的 KW 宏字符串数组');
    }

    const operator = req.userContext || { operatorId: 'OP-DIFF', operatorName: 'DiffAdmin', role: 'admin' };
    const result = await this.applyDiffService.applySelectedDiff(payload, {
      id: operator.operatorId,
      name: operator.operatorName,
    });

    return reply.status(200).send(result);
  }

  async exportExcel(
    req: FastifyRequest<{
      Querystring: {
        baseVersionId: string;
        targetVersionId: string;
        onlyLang?: string;
        hideFalseDiff?: string | boolean;
      };
    }>,
    reply: FastifyReply
  ) {
    const { baseVersionId, targetVersionId, onlyLang, hideFalseDiff } = req.query;
    if (!baseVersionId || !targetVersionId) {
      throw new ValidationError('必须同时提供 baseVersionId 与 targetVersionId');
    }

    const isHide = hideFalseDiff === undefined ? true : String(hideFalseDiff) === 'true';

    const diffResult = await this.diffService.compareVersions({
      baseVersionId,
      targetVersionId,
      onlyLang,
      hideFalseDiff: isHide,
    });

    const buffer = await ExcelDiffExporter.exportDiffToExcel(diffResult);

    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    reply.header(
      'Content-Disposition',
      `attachment; filename="firmware-diff-${Date.now()}.xlsx"`
    );

    return reply.status(200).send(buffer);
  }
}
