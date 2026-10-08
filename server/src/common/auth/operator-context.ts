import { AsyncLocalStorage } from 'node:async_hooks';

export interface OperatorContext {
  operator: string;
  userId?: string;
  role?: string;
}

export const operatorContextStorage = new AsyncLocalStorage<OperatorContext>();

export function getCurrentOperator(): string {
  const store = operatorContextStorage.getStore();
  return store?.operator || '张工 (固件研发组)';
}
