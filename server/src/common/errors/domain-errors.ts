export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EntityNotFoundError extends DomainError {
  readonly statusCode = 404;
  readonly code = 'ENTITY_NOT_FOUND';

  constructor(entityName: string, identifier?: string | number) {
    super(identifier ? `${entityName} (标识: ${identifier}) 不存在` : `${entityName} 不存在`);
  }
}

export class ConflictError extends DomainError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

export class LockViolationError extends DomainError {
  readonly statusCode = 403;
  readonly code = 'LOCK_VIOLATION';

  constructor(message = '词条已被人工加锁锁定，禁止覆写修改') {
    super(message);
  }
}

export class SealedVersionError extends DomainError {
  readonly statusCode = 403;
  readonly code = 'SEALED_VERSION';

  constructor(message = '固件版本已封板归档，处于只读冻结状态，禁止任何变更') {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(message = '未授权的操作请求') {
    super(message);
  }
}
