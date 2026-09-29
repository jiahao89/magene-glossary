import { TermRepository } from './term.repository.js';
import { CreateTermDto, QueryTermsDto, UpdateTermDto, UpsertTranslationDto } from './term.schema.js';
import {
  EntityNotFoundError,
  ConflictError,
  LockViolationError,
  SealedVersionError,
} from '../../common/errors/domain-errors.js';
import { ChangeAuditService } from '../audit/audit.service.js';
import { SnapshotService } from '../audit/snapshot.service.js';

function parseOperator(operator: string) {
  const match = operator.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { name: match[1].trim(), id: match[2].trim() };
  }
  return { name: operator, id: operator };
}

export class TermService {
  private auditService: ChangeAuditService;
  private snapshotService: SnapshotService;

  constructor(
    private repo: TermRepository,
    auditService?: ChangeAuditService,
    snapshotService?: SnapshotService
  ) {
    this.auditService = auditService || new ChangeAuditService();
    this.snapshotService = snapshotService || new SnapshotService();
  }

  async createTerm(dto: CreateTermDto, operator: string) {
    // 1. 校验所属版本状态
    const version = await this.repo.findVersionById(dto.versionId);
    if (!version) {
      throw new EntityNotFoundError('固件版本', dto.versionId);
    }
    if (version.isSealed) {
      throw new SealedVersionError('固件版本已封板归档，禁止新增词条');
    }

    // 2. 校验 KW 宏唯一性
    const existing = await this.repo.findTermByKw(dto.versionId, dto.kw);
    if (existing) {
      throw new ConflictError(`词条宏定义 '${dto.kw}' 在当前版本 (${version.versionName}) 中已存在`);
    }

    // 3. 执行创建
    const term = await this.repo.createTerm(dto, operator);
    const op = parseOperator(operator);

    // 4. 自动审计捕获与全量快照拍摄
    try {
      await this.auditService.captureChange({
        termId: term.id,
        versionId: dto.versionId,
        kw: dto.kw,
        targetLang: null,
        action: 'CREATE',
        oldValue: null,
        newValue: dto.zhCn,
        operatorId: op.id,
        operatorName: op.name,
      });

      await this.snapshotService.createSnapshot({
        termId: term.id,
        versionId: dto.versionId,
        operatorId: op.id,
        operatorName: op.name,
        reason: 'MANUAL_EDIT',
      });
    } catch (err) {
      console.warn('⚠️ 自动审计或快照失败:', err);
    }

    return term;
  }

  async getTermById(termId: string) {
    const term = await this.repo.findTermWithTranslations(termId);
    if (!term) {
      throw new EntityNotFoundError('词条', termId);
    }
    return term;
  }

  async updateTerm(termId: string, dto: UpdateTermDto, operator: string) {
    // 1. 查找词条
    const term = await this.repo.findTermById(termId);
    if (!term) {
      throw new EntityNotFoundError('词条', termId);
    }

    // 2. 校验所属版本封板状态
    const version = await this.repo.findVersionById(term.versionId);
    if (version && version.isSealed) {
      throw new SealedVersionError('固件版本已封板归档，禁止修改词条');
    }

    // 3. 词条加锁防御规则 (Lock Invariant)
    const isModifyingContent =
      dto.zhCn !== undefined ||
      dto.context !== undefined ||
      dto.ownerComponent !== undefined ||
      dto.maxChars !== undefined ||
      dto.sortOrder !== undefined;

    if (term.isLocked && isModifyingContent) {
      throw new LockViolationError(`词条 '${term.kw}' 已被人工加锁锁定，禁止修改元数据`);
    }

    const updated = await this.repo.updateTerm(termId, dto, operator);
    const op = parseOperator(operator);

    // 4. 自动记录主表变更审计
    try {
      if (dto.zhCn !== undefined && dto.zhCn !== term.zhCn) {
        await this.auditService.captureChange({
          termId,
          versionId: term.versionId,
          kw: term.kw,
          targetLang: null,
          action: 'UPDATE',
          oldValue: term.zhCn,
          newValue: dto.zhCn,
          operatorId: op.id,
          operatorName: op.name,
          reason: '修改中文原文',
        });
      }
      if (dto.maxChars !== undefined && dto.maxChars !== term.maxChars) {
        await this.auditService.captureChange({
          termId,
          versionId: term.versionId,
          kw: term.kw,
          targetLang: null,
          action: 'UPDATE',
          oldValue: String(term.maxChars),
          newValue: String(dto.maxChars),
          operatorId: op.id,
          operatorName: op.name,
          reason: '修改物理字符上限',
        });
      }

      await this.snapshotService.createSnapshot({
        termId,
        versionId: term.versionId,
        operatorId: op.id,
        operatorName: op.name,
        reason: 'MANUAL_EDIT',
      });
    } catch (err) {
      console.warn('⚠️ 自动审计或快照失败:', err);
    }

    return updated;
  }

  async deleteTerm(termId: string) {
    const term = await this.repo.findTermById(termId);
    if (!term) {
      throw new EntityNotFoundError('词条', termId);
    }

    const version = await this.repo.findVersionById(term.versionId);
    if (version && version.isSealed) {
      throw new SealedVersionError('固件版本已封板归档，禁止删除词条');
    }

    if (term.isLocked) {
      throw new LockViolationError(`词条 '${term.kw}' 已被人工加锁锁定，禁止删除`);
    }

    return await this.repo.deleteTerm(termId);
  }

  async upsertTranslation(termId: string, dto: UpsertTranslationDto, operator: string) {
    const term = await this.repo.findTermById(termId);
    if (!term) {
      throw new EntityNotFoundError('词条', termId);
    }

    const version = await this.repo.findVersionById(term.versionId);
    if (version && version.isSealed) {
      throw new SealedVersionError('固件版本已封板归档，禁止修改译文');
    }

    if (term.isLocked) {
      throw new LockViolationError(`词条 '${term.kw}' 已被人工加锁锁定，禁止覆写翻译`);
    }

    // 读取修改前译文（用于审计计算）
    const termWithTranslations = await this.repo.findTermWithTranslations(termId);
    const oldTranslation = termWithTranslations?.translations?.[dto.languageCode] || '';

    const result = await this.repo.upsertTranslation(
      termId,
      dto.languageCode,
      dto.translationText,
      dto.sourceType || 'human',
      operator
    );

    const op = parseOperator(operator);

    try {
      await this.auditService.captureChange({
        termId,
        versionId: term.versionId,
        kw: term.kw,
        targetLang: dto.languageCode,
        action: oldTranslation ? 'UPDATE' : 'CREATE',
        oldValue: oldTranslation || null,
        newValue: dto.translationText,
        operatorId: op.id,
        operatorName: op.name,
        sourceType: (dto.sourceType as any) || 'human',
      });

      await this.snapshotService.createSnapshot({
        termId,
        versionId: term.versionId,
        operatorId: op.id,
        operatorName: op.name,
        reason: 'MANUAL_EDIT',
      });
    } catch (err) {
      console.warn('⚠️ 自动审计或快照失败:', err);
    }

    return result;
  }

  async listTerms(versionId: string, query: QueryTermsDto) {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new EntityNotFoundError('固件版本', versionId);
    }

    return await this.repo.queryTermsByVersion(versionId, query);
  }
}
