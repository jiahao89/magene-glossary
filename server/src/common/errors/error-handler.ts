import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from './domain-errors.js';

const STATUS_TEXT_MAP: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

export function globalErrorHandler(
  error: FastifyError | DomainError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const timestamp = new Date().toISOString();

  // 1. 业务领域异常处理 (Domain Errors)
  if (error instanceof DomainError) {
    const statusCode = error.statusCode;
    const errorText = STATUS_TEXT_MAP[statusCode] || 'Error';

    return reply.status(statusCode).send({
      statusCode,
      error: errorText,
      code: error.code,
      message: error.message,
      timestamp,
      path: request.url,
    });
  }

  // 2. Fastify 原生校验异常 (Schema Validation Errors)
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: error.message,
      details: error.validation,
      timestamp,
      path: request.url,
    });
  }

  // 3. Fastify HTTP 错误 (404 Not Found 路由等)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;
    return reply.status(statusCode).send({
      statusCode,
      error: error.name || STATUS_TEXT_MAP[statusCode] || 'HTTP Error',
      code: error.code || 'HTTP_ERROR',
      message: error.message,
      timestamp,
      path: request.url,
    });
  }

  // 4. 未捕获的系统内部异常 (500 Internal Server Error) - 生产环境脱敏
  request.log.error(error);

  const isProduction = process.env.NODE_ENV === 'production';
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? '系统服务出现意外故障，请联系系统管理员' : error.message,
    timestamp,
    path: request.url,
  });
}
