import { useState, useEffect, useCallback } from 'react';
import { apiFetch, safeGetLocalStorage } from '../utils/api';
import { useToast } from '../components/Toast';

/**
 * useOptimisticTerm
 * 集中接管：单元格高亮修改标记状态追踪、行级锁定/批量锁定切换、乐观更新与并发冲突捕获。
 */
export function useOptimisticTerm({ selectedTableId } = {}) {
  const toast = useToast();

  // 单元格高亮（修改/新增标记）状态
  const [modifiedCells, setModifiedCells] = useState(() => {
    return safeGetLocalStorage('glossahub_modified_cells', {});
  });

  // 防抖 localStorage 持久化（避免每次单元格编辑都阻塞主线程）
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('glossahub_modified_cells', JSON.stringify(modifiedCells));
      } catch (err) {
        console.warn('Failed to persist modified cells:', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [modifiedCells]);

  // 切换表格时清空高亮标记
  useEffect(() => {
    setModifiedCells({});
  }, [selectedTableId]);

  // 清除某条记录的高亮状态
  const clearModified = useCallback((recordId) => {
    if (!recordId) return;
    setModifiedCells(prev => {
      if (!prev[recordId]) return prev;
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  }, []);

  // 标记某单元格被修改
  const markCellModified = useCallback((recordId, fieldKey) => {
    if (!recordId || !fieldKey) return;
    setModifiedCells(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [fieldKey]: true
      }
    }));
  }, []);

  // 行锁定加载 ID
  const [lockLoadingId, setLockLoadingId] = useState('');

  // 切换单行锁定
  const handleToggleRowLock = useCallback(async (recId, currentLockState, setRecords) => {
    const nextState = !currentLockState;
    try {
      setLockLoadingId(recId);
      const res = await apiFetch(`/api/terms/${recId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextState })
      });
      if (res.ok) {
        toast.success(nextState ? '词条已成功锁定' : '词条已解锁');
        if (setRecords) {
          setRecords(prev => prev.map(r => r.recordId === recId ? { ...r, isLocked: nextState ? 1 : 0 } : r));
        }
        return true;
      }
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error || '操作失败');
      return false;
    } catch {
      toast.error('修改锁定状态失败');
      return false;
    } finally {
      setLockLoadingId('');
    }
  }, [toast]);

  // 批量锁定/解锁
  const handleBatchLock = useCallback(async (lock, selectedRecordIds, onFinished) => {
    const ids = Array.from(selectedRecordIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map(id => handleToggleRowLock(id, !lock))
    );
    const okCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failCount = ids.length - okCount;
    if (failCount > 0) {
      toast.error(`批量${lock ? '锁定' : '解锁'}完成：${okCount} 条成功，${failCount} 条失败`);
    } else {
      toast.success(`批量${lock ? '锁定' : '解锁'}完成：${okCount} 条成功`);
    }
    if (onFinished) {
      await onFinished();
    }
  }, [handleToggleRowLock, toast]);

  return {
    modifiedCells,
    setModifiedCells,
    clearModified,
    markCellModified,
    lockLoadingId,
    handleToggleRowLock,
    handleBatchLock
  };
}
