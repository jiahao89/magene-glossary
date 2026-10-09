import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/Toast';

/**
 * useTermsManager
 * 集中接管：词条数据拉取、竞态丢弃、分页计算、多维筛选、客户端排序与行列选择状态。
 */
export function useTermsManager({ selectedTableId, targetLanguagesList = [] }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fieldMap, setFieldMap] = useState({});

  // 分页与服务端筛选状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterUntranslated, setFilterUntranslated] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [sortOrder] = useState('desc');

  // 客户端列排序状态 (不影响导出)
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc' | null

  // 选中行 ID 集合
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set());

  // 防抖搜索输入
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 竞态防护：每次发起请求递增，迟到响应自动丢弃
  const reqIdRef = useRef(0);

  const loadTableData = useCallback(async (tableId) => {
    if (!tableId) return;
    const myId = ++reqIdRef.current;
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage,
        pageSize,
        search: debouncedSearchQuery,
        status: filterStatus,
        untranslated: filterUntranslated ? 'true' : 'false',
        sortBy,
        sortOrder
      });

      const res = await apiFetch(`/api/tables/${tableId}/records?${queryParams.toString()}`);

      if (myId !== reqIdRef.current) return;

      if (res.ok) {
        const rData = await res.json().catch(() => ({}));
        if (myId !== reqIdRef.current) return;
        setRecords(rData.records || []);
        setTotalRecords(rData.total || 0);

        const fMap = {
          'KW': 'KW',
          'CN（中文）': 'CN（中文）',
          '所在页面': '所在页面',
          '字号类别': '字号类别'
        };
        targetLanguagesList.forEach(lang => {
          fMap[lang] = lang;
        });

        setFieldMap(fMap);
      } else {
        toast.error('获取词条数据失败');
      }
    } catch (err) {
      if (myId === reqIdRef.current) {
        console.error('加载表格数据失败:', err);
        toast.error(`获取词条数据失败: ${err.message}`);
      }
    } finally {
      if (myId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize, debouncedSearchQuery, filterStatus, filterUntranslated, sortBy, sortOrder, toast, targetLanguagesList]);

  // 表格切换重置选中态
  useEffect(() => {
    setSelectedRecordIds(new Set());
  }, [selectedTableId]);

  // 字段取值助手
  const getRecordValue = useCallback((rec, fieldId) => {
    if (!rec || !rec.fields) return '';
    return rec.fields[fieldId] || '';
  }, []);

  const getRecordValueByName = useCallback((rec, fieldName) => {
    const fId = fieldMap[fieldName];
    if (fId) return getRecordValue(rec, fId);
    return rec?.fields ? rec.fields[fieldName] || '' : '';
  }, [fieldMap, getRecordValue]);

  // 列排序切换
  const handleToggleSort = useCallback((field) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField(null);
      setSortDirection(null);
    }
  }, [sortField, sortDirection]);

  // 客户端排序列记录
  const sortedRecords = useMemo(() => {
    if (!sortField || !sortDirection) {
      return records;
    }

    return [...records].sort((a, b) => {
      if (sortField === '#index' || sortField === 'index') {
        const ordA = a.sortOrder ?? a.sort_order ?? 0;
        const ordB = b.sortOrder ?? b.sort_order ?? 0;
        return sortDirection === 'asc' ? ordA - ordB : ordB - ordA;
      }

      if (sortField === 'status') {
        const stA = a.status || 'DRAFT';
        const stB = b.status || 'DRAFT';
        const cmp = stA.localeCompare(stB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      if (sortField === 'progress') {
        const getProgressCount = (rec) => {
          let filled = 0;
          targetLanguagesList.forEach(lang => {
            const val = getRecordValueByName(rec, lang);
            if (val && String(val).trim()) filled++;
          });
          return filled;
        };
        const pA = getProgressCount(a);
        const pB = getProgressCount(b);
        return sortDirection === 'asc' ? pA - pB : pB - pA;
      }

      const valA = String(getRecordValueByName(a, sortField) || '');
      const valB = String(getRecordValueByName(b, sortField) || '');
      const cmp = valA.localeCompare(valB, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [records, sortField, sortDirection, getRecordValueByName, targetLanguagesList]);

  // 选中项记忆化引用
  const selectedTerms = useMemo(
    () => records.filter(r => selectedRecordIds.has(r.recordId || r.id)),
    [records, selectedRecordIds]
  );

  // 全选/反选本页
  const handleSelectAllOnPage = useCallback((checked) => {
    if (checked) {
      setSelectedRecordIds(prev => new Set([...prev, ...sortedRecords.map(r => r.recordId || r.id)]));
    } else {
      const pageIds = new Set(sortedRecords.map(r => r.recordId || r.id));
      setSelectedRecordIds(prev => new Set([...prev].filter(id => !pageIds.has(id))));
    }
  }, [sortedRecords]);

  // 单选/反选某行
  const handleToggleSelectRow = useCallback((recId, checked) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(recId);
      } else {
        next.delete(recId);
      }
      return next;
    });
  }, []);

  return {
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
    debouncedSearchQuery,
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
    reload: () => loadTableData(selectedTableId),
    getRecordValue,
    getRecordValueByName
  };
}
