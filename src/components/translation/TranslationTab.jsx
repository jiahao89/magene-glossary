import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, safeGetLocalStorage } from '../../utils/api';
import { findTranslationForLang, DEFAULT_TARGET_LANGUAGES } from '../../utils/languageHelper';
import { downloadBlob, buildExportFilename } from '../../utils/download.js';
import { useToast } from '../Toast';
import { useTermsManager } from '../../hooks/useTermsManager';
import { useOptimisticTerm } from '../../hooks/useOptimisticTerm';
import { BatchCategoryModal, BatchCopyModal, BatchApproveModal } from './BatchActionsModal';
import BatchTranslateModal from './BatchTranslateModal';
import TranslationToolbar from './TranslationToolbar';
import CSVImportHandler from './CSVImportHandler';
import AddTermModal from './AddTermModal';
import BatchAddModal from './BatchAddModal';
import EditTermModal from './EditTermModal';
import InheritModal from './InheritModal';
import TranslationTable from './TranslationTable';
import CopyContentModal from './CopyContentModal';
import BatchGenerateKwModal from './BatchGenerateKwModal';

export default function TranslationTab({ 
  difyConnected = false,
  user: propUser,
  selectedTableId: propSelectedTableId,
  setSelectedTableId: propSetSelectedTableId,
  projectRole = 'viewer'
}) {
  const toast = useToast();

  const [targetLanguagesList, setTargetLanguagesList] = useState(DEFAULT_TARGET_LANGUAGES);
  const TARGET_LANGUAGES = targetLanguagesList;
  const [difyConfigured, setDifyConfigured] = useState(false);

  useEffect(() => {
    const loadProjLanguages = async () => {
      try {
        const res = await apiFetch('/api/projects/proj-default/languages');
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.length > 0) {
            setTargetLanguagesList(data.map(item => item.lang_name));
          }
        }
      } catch (err) {
        console.error('加载语种列表失败:', err);
      }
    };

    const loadDifyState = async () => {
      try {
        const res = await apiFetch('/api/projects/proj-default/dify');
        if (res.ok) {
          const data = await res.json();
          setDifyConfigured(data.apiKeyConfigured);
        }
      } catch (err) {
        console.error('加载 Dify 配置状态失败:', err);
      }
    };

    loadProjLanguages();
    loadDifyState();
  }, []);

  // Bitable State
  const [tables, setTables] = useState([]);
  const [internalSelectedTableId, setInternalSelectedTableId] = useState(() => {
    return safeGetLocalStorage('glossa_last_selected_table_id', '');
  });
  const selectedTableId = (propSelectedTableId !== undefined && propSelectedTableId !== '') ? propSelectedTableId : internalSelectedTableId;
  const setSelectedTableId = useCallback((val) => {
    if (val) {
      localStorage.setItem('glossa_last_selected_table_id', val);
    }
    if (propSetSelectedTableId) {
      propSetSelectedTableId(val);
    } else {
      setInternalSelectedTableId(val);
    }
  }, [propSetSelectedTableId]);

  // Hook 1: 核心词条状态管理 (分页、多维检索、列排序、行列选择)
  const {
    records,
    setRecords,
    totalRecords,
    loading,
    setLoading,
    fieldMap,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchInput,
    setSearchInput,
    filterUntranslated,
    setFilterUntranslated,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    handleToggleSort,
    sortedRecords,
    selectedRecordIds,
    setSelectedRecordIds,
    selectedTerms,
    handleSelectAllOnPage,
    handleToggleSelectRow,
    loadTableData,
    getRecordValue,
    getRecordValueByName
  } = useTermsManager({
    selectedTableId,
    targetLanguagesList
  });

  const paginatedRecords = sortedRecords;

  // Hook 2: 乐观锁、高亮追踪与锁定控制
  const {
    modifiedCells,
    setModifiedCells,
    clearModified,
    lockLoadingId,
    handleToggleRowLock: rawToggleLock,
    handleBatchLock: rawBatchLock
  } = useOptimisticTerm({ selectedTableId });

  const handleToggleRowLock = useCallback((recId, currentLockState) => {
    return rawToggleLock(recId, currentLockState, setRecords);
  }, [rawToggleLock, setRecords]);

  const handleBatchLock = useCallback((lock) => {
    return rawBatchLock(lock, selectedRecordIds, () => loadTableData(selectedTableId));
  }, [rawBatchLock, selectedRecordIds, loadTableData, selectedTableId]);

  // State for Batch Add Modal
  const [batchAddModalOpen, setBatchAddModalOpen] = useState(false);
  const [inheritOpen, setInheritOpen] = useState(false);

  // Column Visibility States
  const [visibleLanguages, setVisibleLanguages] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1000) {
      return ['EN（英文）'];
    }
    return targetLanguagesList;
  });

  const BASE_OPTIONAL_COLUMNS = [
    { key: '所在页面', label: '所在页面' },
    { key: '字号类别', label: '字号/负责人' },
  ];
  const [hiddenBaseColumns, setHiddenBaseColumns] = useState(() => {
    return new Set(['所在页面', '字号类别']);
  });

  // Modal States
  const [editModalRecord, setEditModalRecord] = useState(null);
  const [_addModalOpen, setAddModalOpen] = useState(false);
  const [copyContentOpen, setCopyContentOpen] = useState(false);
  const [batchTranslateOpen, setBatchTranslateOpen] = useState(false);
  const [batchGenerateKwOpen, setBatchGenerateKwOpen] = useState(false);

  const [batchTargetTableId, setBatchTargetTableId] = useState('');
  const [selectedBatchItemIds, setSelectedBatchItemIds] = useState(new Set());
  const [batchPreviewList, setBatchPreviewList] = useState([]);
  const [isTranslatingBatch, setIsTranslatingBatch] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, current: 0, status: '' });

  // Batch Update/Copy/Approve States
  const [batchUpdateOpen, setBatchUpdateOpen] = useState(false);
  const [batchCopyOpen, setBatchCopyOpen] = useState(false);
  const [batchUpdateFields, setBatchUpdateFields] = useState({ context: '', owner: '' });
  const [batchCopyTargetTableId, setBatchCopyTargetTableId] = useState('');
  const [batchCopyDuplicateStrategy, setBatchCopyDuplicateStrategy] = useState('skip');
  const [batchApproveOpen, setBatchApproveOpen] = useState(false);
  const [batchApproveStatus, setBatchApproveStatus] = useState('APPROVED');
  const [batchApproveRejectReason, setBatchApproveRejectReason] = useState('');

  // 当前用户：优先使用父组件传入的 user prop，localStorage 兜底
  const fallbackUser = useMemo(() => safeGetLocalStorage('user', null), []);
  const currentUser = propUser ?? fallbackUser;

  // Excluded target languages for translation
  const [excludedTranslateLangs, setExcludedTranslateLangs] = useState(() => {
    return new Set(safeGetLocalStorage('glossa_excluded_translate_langs', []));
  });

  useEffect(() => {
    if (selectedTableId) {
      const tableSaved = safeGetLocalStorage(`glossa_excluded_translate_langs_${selectedTableId}`, null);
      if (tableSaved && Array.isArray(tableSaved)) {
        setExcludedTranslateLangs(new Set(tableSaved));
      }
    }
  }, [selectedTableId]);

  const handleSetExcludedTranslateLangs = useCallback((newSet) => {
    setExcludedTranslateLangs(newSet);
    if (selectedTableId) {
      try {
        localStorage.setItem(`glossa_excluded_translate_langs_${selectedTableId}`, JSON.stringify(Array.from(newSet)));
        localStorage.setItem('glossa_excluded_translate_langs', JSON.stringify(Array.from(newSet)));
      } catch {}
    }
  }, [selectedTableId]);

  const handleToggleExcludeLang = useCallback((lang) => {
    const next = new Set(excludedTranslateLangs);
    if (next.has(lang)) {
      next.delete(lang);
    } else {
      next.add(lang);
    }
    handleSetExcludedTranslateLangs(next);
  }, [excludedTranslateLangs, handleSetExcludedTranslateLangs]);

  const handleOpenBatchTranslate = async () => {
    let targetRecords = records;
    if (selectedRecordIds.size > 0) {
      targetRecords = records.filter(r => selectedRecordIds.has(r.recordId || r.id));
    }

    const activeTargetLangs = TARGET_LANGUAGES.filter(lang => !excludedTranslateLangs.has(lang));

    const itemsToTranslate = targetRecords.map(r => {
      const fields = r.fields || {};
      const zhCn = (fields['CN（中文）'] || '').trim();
      if (!zhCn) return null;
      
      const missingLangs = activeTargetLangs.filter(lang => !fields[lang] || String(fields[lang]).trim() === '');
      if (missingLangs.length === 0) return null;
      
      return {
        recordId: r.recordId || r.id,
        KW: fields['KW'] || '',
        '中文': zhCn,
        '所在页面': fields['所在页面'] || '',
        existingFields: fields,
        missingLangs,
        translations: {}
      };
    }).filter(Boolean);

    if (itemsToTranslate.length === 0) {
      if (selectedRecordIds.size > 0) {
        if (targetRecords.length === 0) {
          toast.info('选中的记录不在当前表中, 请重新勾选');
        } else {
          toast.info('选中的词条在当前翻译语种范围内均已完成翻译');
        }
      } else {
        toast.info('当前表格中在选定语种范围内没有待翻译的词条');
      }
      return;
    }

    setBatchTargetTableId(selectedTableId);
    setBatchPreviewList(itemsToTranslate);
    setSelectedBatchItemIds(new Set(itemsToTranslate.map(i => i.recordId)));
    setBatchProgress({ total: itemsToTranslate.length, current: 0, status: '准备开始...' });
    setBatchTranslateOpen(true);

    startBatchTranslateProcess(itemsToTranslate);
  };

  const startBatchTranslateProcess = async (items) => {
    setIsTranslatingBatch(true);
    let completedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const totalTasks = items.length;

    const workingList = [...items];
    const tasks = items.map((item, index) => ({ item, index }));

    let pendingFlush = 0;
    const flushPreview = (force = false) => {
      if (force || pendingFlush >= 3 || completedCount === totalTasks) {
        pendingFlush = 0;
        setBatchPreviewList([...workingList]);
      }
    };

    const translateTask = async ({ item, index: i }) => {
      try {
        const activeTargetLangs = TARGET_LANGUAGES.filter(lang => !excludedTranslateLangs.has(lang));
        const effectiveMissingLangs = (item.missingLangs || []).filter(l => activeTargetLangs.includes(l));
        if (effectiveMissingLangs.length === 0) {
          return;
        }

        const inputs = {
          KW: item.KW || '',
          zh_cn: item['中文'] || '',
          context: item['所在页面'] || '',
          target_languages: effectiveMissingLangs.join(', ')
        };

        let res = null;
        let lastErr = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            res = await apiFetch(`/api/projects/proj-default/ai-translate?debug=1`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inputs })
            });
            if (res.ok) {
              lastErr = null;
              break;
            }
            const error = await res.json().catch(() => ({}));
            let msg = error.error || '翻译接口失败';
            if (msg.includes('PluginInvokeError') || msg.includes('google/genai')) {
              msg = 'Dify 内部大模型插件异常 (Google GenAI 报错或频率超限)';
            } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
              msg = 'AI 模型请求频次超限 (Rate Limit)';
            } else if (msg.includes('timeout') || msg.includes('Timeout')) {
              msg = 'AI 翻译请求超时';
            }
            lastErr = new Error(msg);
          } catch (e) {
            lastErr = e;
          }
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (!res || !res.ok) {
          throw lastErr || new Error('翻译失败');
        }
        
        const result = await res.json().catch(() => ({}));
        
        const trans = {};
        effectiveMissingLangs.forEach(lang => {
          const val = findTranslationForLang(result, lang);
          if (val) trans[lang] = val;
        });
        
        const nextItem = { ...workingList[i] };
        if (result._source === 'tm') {
          nextItem.tmMatch = true;
        }
        
        if (Object.keys(trans).length > 0) {
          nextItem.translations = { ...(nextItem.translations || {}), ...trans };
          successCount++;
        } else {
          errorCount++;
        }
        workingList[i] = nextItem;
      } catch (err) {
        errorCount++;
        console.error(`翻译词条 ${item.KW} 失败:`, err);
        toast.error(`翻译词条「${item.KW || item['中文']}」失败: ${err.message}`);
      } finally {
        completedCount++;
        pendingFlush++;
        flushPreview();
        setBatchProgress({
          total: totalTasks,
          current: completedCount,
          status: `正在并发翻译 (${completedCount}/${totalTasks}): ${item.KW || item['中文']}`
        });
      }
    };

    const CONCURRENCY = 3;
    let taskPointer = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
      while (taskPointer < tasks.length) {
        const currentTask = tasks[taskPointer++];
        await translateTask(currentTask);
      }
    });

    await Promise.all(workers);

    flushPreview(true);
    setIsTranslatingBatch(false);
    if (errorCount > 0) {
      setBatchProgress(prev => ({ 
        ...prev, 
        status: `批量翻译完成！${successCount} 条成功` + (errorCount > 0 ? `，${errorCount} 条失败/无输出` : '') + '。请检查预览内容。' 
      }));
    } else {
      setBatchProgress(prev => ({ ...prev, status: '批量翻译全部完成！请检查预览内容并确认写入。' }));
    }
  };

  const handleConfirmBatchWrite = async () => {
    try {
      setIsSavingBatch(true);
      const recordsToUpdate = [];
      
      batchPreviewList.forEach(item => {
        if (!selectedBatchItemIds.has(item.recordId)) return;
        const fields = {};
        let hasTrans = false;
        
        if (item.translations) {
          Object.keys(item.translations).forEach(lang => {
            const val = item.translations[lang];
            if (val && String(val).trim() !== '') {
              fields[lang] = val;
              hasTrans = true;
            }
          });
        }
        
        if (hasTrans) {
          const transMeta = {};
          if (item.tmMatch) {
            Object.keys(fields).forEach(l => {
              transMeta[l] = 'tm';
            });
          }
          recordsToUpdate.push({
            id: item.recordId,
            fields,
            translationsMeta: Object.keys(transMeta).length > 0 ? transMeta : undefined
          });
        }
      });

      if (recordsToUpdate.length === 0) {
        toast.info('没有需要写入的翻译结果');
        setIsSavingBatch(false);
        return;
      }

      const res = await apiFetch(`/api/tables/${batchTargetTableId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: recordsToUpdate
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '批量写入保存失败');
      }

      const syncResult = await res.json().catch(() => ({}));
      toast.success(syncResult.message || `成功写入 ${recordsToUpdate.length} 条翻译记录！`);
      
      setModifiedCells(prev => {
        const newModified = { ...prev };
        recordsToUpdate.forEach(r => {
          const itemInPreview = batchPreviewList.find(i => i.recordId === r.id);
          const langs = {};
          if (itemInPreview && itemInPreview.translations) {
            Object.keys(itemInPreview.translations).forEach(l => {
              if (itemInPreview.translations[l]) langs[l] = true;
            });
          }
          newModified[r.id] = { ...(newModified[r.id] || {}), ...langs, isModified: true };
        });
        return newModified;
      });
      setBatchTranslateOpen(false);
      setBatchPreviewList([]);
      loadTableData(batchTargetTableId);
    } catch(err) {
      toast.error(err.message);
    } finally {
      setIsSavingBatch(false);
    }
  };

  const loadTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/tables');
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setTables(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('获取表格列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  useEffect(() => {
    if (tables.length === 0) return;
    const savedTableId = safeGetLocalStorage('glossa_last_selected_table_id', '');
    const matched = tables.find(t => t.id === (selectedTableId || savedTableId));
    if (matched) {
      if (matched.id !== selectedTableId) {
        setSelectedTableId(matched.id);
      }
    } else if (!selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables, selectedTableId, setSelectedTableId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const handleEditClick = useCallback((rec) => {
    setEditModalRecord(rec);
    const recId = rec.recordId || rec.id;
    if (recId) clearModified(recId);
  }, [clearModified]);

  const handleBatchApproveSubmit = async () => {
    if (selectedRecordIds.size === 0) return;
    const termIds = Array.from(selectedRecordIds);
    try {
      setLoading(true);
      const res = await apiFetch('/api/terms/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termIds,
          status: batchApproveStatus,
          rejectReason: batchApproveStatus === 'REJECTED' ? batchApproveRejectReason : undefined
        })
      });
      if (res.ok) {
        toast.success(`成功更新 ${termIds.length} 条词条处理状态为 ${batchApproveStatus}`);
        setBatchApproveOpen(false);
        setSelectedRecordIds(new Set());
        loadTableData(selectedTableId);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '批量审核失败');
      }
    } catch (err) {
      toast.error(`批量审核失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecordIds.size === 0) return;
    const termIds = Array.from(selectedRecordIds);
    if (!window.confirm(
      `确定要将选中的 ${termIds.length} 条词条送入回收站吗？\n\n` +
      `• 30 天内可在「数据回收站」一键恢复\n` +
      `• 已锁定的词条会被自动跳过\n` +
      `• 此操作会写入「批量删除」审计日志`
    )) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/terms/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '批量删除失败');
      }
      const data = await res.json();
      const lockedNote = data.lockedSkipped > 0
        ? ` (跳过 ${data.lockedSkipped} 条已锁定词条)`
        : '';
      toast.success(`${data.message || '已删除'}${lockedNote}`);
      setSelectedRecordIds(new Set());
      await loadTableData(selectedTableId);
    } catch (err) {
      toast.error(err.message || '批量删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchClearTranslations = async () => {
    if (selectedRecordIds.size === 0) return;
    const termIds = Array.from(selectedRecordIds);
    if (!window.confirm(
      `确定要清空选中的 ${termIds.length} 条词条的全部目标语种翻译吗？\n\n` +
      `• 将保留中文（CN）及 KW、所在页面、字号类别等基础属性\n` +
      `• 清空全部目标语种（英文、法、德、西等）翻译内容\n` +
      `• 已锁定的词条将被自动跳过保护`
    )) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/terms/batch-clear-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '批量清空翻译失败');
      }
      const data = await res.json();
      toast.success(data.message || `成功清空 ${termIds.length} 条词条的翻译！`);
      setSelectedRecordIds(new Set());
      await loadTableData(selectedTableId);
    } catch (err) {
      toast.error(err.message || '批量清空翻译失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpdateCategorySubmit = async () => {
    if (selectedRecordIds.size === 0) return;
    try {
      setLoading(true);
      const updates = {};
      if (batchUpdateFields.context) updates['所在页面'] = batchUpdateFields.context;
      if (batchUpdateFields.owner) updates['字号类别'] = batchUpdateFields.owner;

      const res = await apiFetch(`/api/terms/batch-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termIds: Array.from(selectedRecordIds),
          updates
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '批量修改分类失败');
      }

      toast.success('批量更新分类成功！');
      setBatchUpdateOpen(false);
      setBatchUpdateFields({ context: '', owner: '' });
      setSelectedRecordIds(new Set());
      await loadTableData(selectedTableId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCopySubmit = async () => {
    if (selectedRecordIds.size === 0 || !batchCopyTargetTableId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/terms/batch-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termIds: Array.from(selectedRecordIds),
          targetVersionId: batchCopyTargetTableId,
          duplicateStrategy: batchCopyDuplicateStrategy
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '复制失败');
      }

      const result = await res.json().catch(() => ({}));
      toast.success(result.message || '复制成功！');
      setBatchCopyOpen(false);
      setSelectedRecordIds(new Set());
      if (batchCopyTargetTableId === selectedTableId) {
        await loadTableData(selectedTableId);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportXLS = async () => {
    if (!selectedTableId) {
      toast.error('请选择需要导出的数据表！');
      return;
    }

    try {
      toast.info('正在导出 Excel 文件...');
      const res = await apiFetch(`/api/tables/${selectedTableId}/export-xls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifiedCells,
          highlightIds: Object.keys(modifiedCells || {})
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const tableName = tables.find(t => t.id === selectedTableId)?.name || selectedTableId;
        downloadBlob(blob, buildExportFilename('GlossaHub', tableName, 'xlsx'));
        toast.success('导出 Excel 文件成功！');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`导出失败: ${errData.error || '服务器响应异常'}`);
      }
    } catch (err) {
      console.error('导出异常:', err);
      toast.error(`导出失败: ${err.message}`);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedTableId) {
      toast.error('请选择需要导出的数据表！');
      return;
    }

    try {
      toast.info('正在导出 CSV 文件...');
      const res = await apiFetch(`/api/tables/${selectedTableId}/export-csv`);
      if (res.ok) {
        const blob = await res.blob();
        const tableName = tables.find(t => t.id === selectedTableId)?.name || selectedTableId;
        downloadBlob(blob, buildExportFilename('GlossaHub', tableName, 'csv'));
        toast.success('导出 CSV 文件成功！');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`导出 CSV 失败: ${errData.error || '服务器响应异常'}`);
      }
    } catch (err) {
      console.error('导出 CSV 异常:', err);
      toast.error(`导出 CSV 失败: ${err.message}`);
    }
  };

  const handleDataClean = async () => {
    if (!window.confirm('确定要清理当前数据表中的空词条（无KW或无中文）吗？这无法撤销！')) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`/api/tables/${selectedTableId}/clean-empty`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '清理失败');
      }
      const data = await res.json();
      toast.success(data.message || '清理完成');
      await loadTableData(selectedTableId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.8rem 1.2rem', gap: '0.8rem' }}>
      <TranslationToolbar
        searchInput={searchInput}
        setSearchInput={(val) => {
          setSearchInput(val);
          setCurrentPage(1);
        }}
        totalRecords={totalRecords}
        difyConfigured={difyConfigured || difyConnected}
        filterStatus={filterStatus}
        setFilterStatus={(val) => {
          setFilterStatus(val);
          setCurrentPage(1);
        }}
        sortBy={sortBy}
        setSortBy={(val) => {
          setSortBy(val);
          setSortField(null);
          setSortDirection(null);
          setCurrentPage(1);
        }}
        filterUntranslated={filterUntranslated}
        setFilterUntranslated={(val) => {
          setFilterUntranslated(val);
          setCurrentPage(1);
        }}
        targetLanguages={targetLanguagesList}
        visibleLanguages={visibleLanguages}
        setVisibleLanguages={setVisibleLanguages}
        baseOptionalColumns={BASE_OPTIONAL_COLUMNS}
        hiddenBaseColumns={hiddenBaseColumns}
        setHiddenBaseColumns={setHiddenBaseColumns}
        tables={tables}
        selectedTableId={selectedTableId}
        setSelectedTableId={setSelectedTableId}
        selectedCount={selectedRecordIds.size}
        onClearSelection={() => setSelectedRecordIds(new Set())}
        onCopyContent={() => setCopyContentOpen(true)}
        onBatchClearTranslations={handleBatchClearTranslations}
        onBatchApprove={() => setBatchApproveOpen(true)}
        onBatchCategory={() => setBatchUpdateOpen(true)}
        onBatchCopy={() => setBatchCopyOpen(true)}
        onBatchLock={() => handleBatchLock(true)}
        onBatchUnlock={() => handleBatchLock(false)}
        onBatchDelete={handleBatchDelete}
        onExportXLS={handleExportXLS}
        onExportCSV={handleExportCSV}
        csvImportNode={
          <CSVImportHandler 
            selectedTableId={selectedTableId}
            currentRecords={records}
            targetLanguages={targetLanguagesList}
            onImportComplete={(diff) => {
              if (diff) {
                setModifiedCells(prev => {
                  const next = { ...prev };
                  if (Array.isArray(diff.added)) {
                    diff.added.forEach(item => {
                      if (item.recordId) next[item.recordId] = { isAdded: true };
                    });
                  }
                  if (Array.isArray(diff.updated)) {
                    diff.updated.forEach(item => {
                      if (item.recordId) next[item.recordId] = { isModified: true };
                    });
                  }
                  return next;
                });
              }
              loadTableData(selectedTableId);
            }}
            disabled={loading}
          />
        }
        onAddTerm={() => setAddModalOpen(true)}
        onBatchAdd={() => setBatchAddModalOpen(true)}
        onInherit={() => setInheritOpen(true)}
        onBatchGenerateKw={() => setBatchGenerateKwOpen(true)}

        onBatchTranslate={handleOpenBatchTranslate}
        onDataClean={handleDataClean}
        onClearHighlights={() => setModifiedCells({})}
        modifiedCount={Object.keys(modifiedCells).length}
        loading={loading}
        projectRole={projectRole}
      />

      <TranslationTable
        loading={loading}
        records={records}
        paginatedRecords={paginatedRecords}
        totalRecords={totalRecords}
        safePage={currentPage}
        pageSize={pageSize}
        setCurrentPage={setCurrentPage}
        setPageSize={setPageSize}
        selectedRecordIds={selectedRecordIds}
        onSelectAll={handleSelectAllOnPage}
        onToggleSelectRow={handleToggleSelectRow}
        targetLanguages={targetLanguagesList}
        visibleLanguages={visibleLanguages}
        hiddenBaseColumns={hiddenBaseColumns}
        modifiedCells={modifiedCells}
        lockLoadingId={lockLoadingId}
        onToggleRowLock={handleToggleRowLock}
        currentUserRole={currentUser?.role}
        projectRole={projectRole}
        getRecordValueByName={getRecordValueByName}
        getRecordValue={getRecordValue}
        fieldMap={fieldMap}
        sortField={sortField}
        sortDirection={sortDirection}
        onToggleSort={handleToggleSort}
        onEditClick={handleEditClick}
      />

      {/* Subcomponent Modals */}
      <AddTermModal
        open={_addModalOpen}
        onClose={() => setAddModalOpen(false)}
        selectedTableId={selectedTableId}
        targetLanguages={targetLanguagesList}
        fieldMap={fieldMap}
        projectRole={projectRole}
        onAddSuccess={() => loadTableData(selectedTableId)}
      />

      <BatchAddModal
        open={batchAddModalOpen}
        onClose={() => setBatchAddModalOpen(false)}
        selectedTableId={selectedTableId}
        targetLanguages={targetLanguagesList}
        onAddSuccess={() => loadTableData(selectedTableId)}
      />

      <EditTermModal
        open={!!editModalRecord}
        record={editModalRecord}
        targetLanguages={targetLanguagesList}
        fieldMap={fieldMap}
        getRecordValue={getRecordValue}
        currentUserRole={currentUser?.role}
        projectRole={projectRole}
        onClose={() => setEditModalRecord(null)}
        onSaveSuccess={() => loadTableData(selectedTableId)}
      />

      <InheritModal
        open={inheritOpen}
        onClose={() => setInheritOpen(false)}
        tables={tables}
        selectedTableId={selectedTableId}
        onSuccess={() => loadTableData(selectedTableId)}
      />

      <BatchCategoryModal
        open={batchUpdateOpen}
        onClose={() => setBatchUpdateOpen(false)}
        selectedCount={selectedRecordIds.size}
        fields={batchUpdateFields}
        setFields={setBatchUpdateFields}
        onSubmit={handleBatchUpdateCategorySubmit}
        loading={loading}
      />

      <BatchCopyModal
        open={batchCopyOpen}
        onClose={() => setBatchCopyOpen(false)}
        selectedCount={selectedRecordIds.size}
        tables={tables}
        currentTableId={selectedTableId}
        targetTableId={batchCopyTargetTableId}
        setTargetTableId={setBatchCopyTargetTableId}
        duplicateStrategy={batchCopyDuplicateStrategy}
        setDuplicateStrategy={setBatchCopyDuplicateStrategy}
        onSubmit={handleBatchCopySubmit}
        loading={loading}
      />

      <BatchApproveModal
        open={batchApproveOpen}
        onClose={() => setBatchApproveOpen(false)}
        selectedCount={selectedRecordIds.size}
        status={batchApproveStatus}
        setStatus={setBatchApproveStatus}
        rejectReason={batchApproveRejectReason}
        setRejectReason={setBatchApproveRejectReason}
        onSubmit={handleBatchApproveSubmit}
        loading={loading}
      />

      <CopyContentModal
        open={copyContentOpen}
        onClose={() => setCopyContentOpen(false)}
        selectedRecords={selectedTerms}
        targetLanguages={targetLanguagesList}
        getRecordValueByName={getRecordValueByName}
      />

      <BatchTranslateModal
        open={batchTranslateOpen}
        onClose={() => {
          if (!isTranslatingBatch) {
            setBatchTranslateOpen(false);
          }
        }}
        previewList={batchPreviewList}
        selectedIds={selectedBatchItemIds}
        setSelectedIds={setSelectedBatchItemIds}
        isTranslating={isTranslatingBatch}
        isSaving={isSavingBatch}
        progress={batchProgress}
        onConfirmWrite={handleConfirmBatchWrite}
        targetLanguages={targetLanguagesList}
        excludedLangs={excludedTranslateLangs}
        onToggleExcludeLang={handleToggleExcludeLang}
        onSelectAllLangs={() => handleSetExcludedTranslateLangs(new Set())}
        onClearAllLangs={() => handleSetExcludedTranslateLangs(new Set(targetLanguagesList))}
      />

      <BatchGenerateKwModal
        open={batchGenerateKwOpen}
        onClose={() => setBatchGenerateKwOpen(false)}
        selectedRecords={selectedTerms}
        selectedTableId={selectedTableId}
        onSuccess={() => loadTableData(selectedTableId)}
      />
    </div>
  );
}
