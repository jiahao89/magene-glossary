import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Trash2, RotateCcw, AlertCircle, Loader2, Rocket, Sparkles, Globe, Cpu, Check, Key } from 'lucide-react';
import { useToast } from './Toast';
import { formatLocaleDateTime } from '../utils/dateTime';

const BUILTIN_KEY_PLACEHOLDER = '内置 Key（由服务端托管）';

export default function SettingsTab({ 
  onConnectionStatusChange,
  projectRole = 'viewer'
}) {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState('engine'); // 'engine' | 'recycle'

  // AI Provider: 'openai' | 'dify' | 'local'
  const [provider, setProvider] = useState('openai');

  // OpenAI / DeepSeek states
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('https://api.deepseek.com/v1');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('deepseek-chat');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);

  // Dify states
  const [difyUrl, setDifyUrl] = useState('https://api.dify.ai/v1');
  const [difyKey, setDifyKey] = useState('');
  const [hasDifyKey, setHasDifyKey] = useState(false);
  const [difyPreset, setDifyPreset] = useState('dify_cloud');

  // Operation states
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recycle Bin states
  const [recycleItems, setRecycleItems] = useState([]);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load current AI configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await apiFetch('/api/projects/proj-default/ai-config');
        if (res.ok) {
          const data = await res.json();
          if (data.provider) setProvider(data.provider);
          if (data.openaiBaseUrl) setOpenaiBaseUrl(data.openaiBaseUrl);
          if (data.openaiModel) setOpenaiModel(data.openaiModel);
          setHasOpenaiKey(data.hasOpenaiKey);

          if (data.difyBaseUrl) {
            setDifyUrl(data.difyBaseUrl);
            if (data.difyBaseUrl.includes('night.magene.cn')) setDifyPreset('magene_night');
            else if (data.difyBaseUrl.includes('api.dify.ai')) setDifyPreset('dify_cloud');
            else setDifyPreset('custom');
          }
          setHasDifyKey(data.hasDifyKey);
        }
      } catch (err) {
        console.error('加载 AI 配置失败:', err);
      }
    }
    loadConfig();
  }, []);

  const handleApplyOpenaiPreset = (presetType) => {
    if (presetType === 'deepseek') {
      setOpenaiBaseUrl('https://api.deepseek.com/v1');
      setOpenaiModel('deepseek-chat');
      toast.info('已加载 [DeepSeek-V3] 官方标准接口预设');
    } else if (presetType === 'qwen') {
      setOpenaiBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1');
      setOpenaiModel('qwen-plus');
      toast.info('已加载 [阿里通义千问] 兼容接口预设');
    } else if (presetType === 'openai') {
      setOpenaiBaseUrl('https://api.openai.com/v1');
      setOpenaiModel('gpt-4o-mini');
      toast.info('已加载 [OpenAI 官方] 接口预设');
    }
  };

  const handleApplyDifyPreset = (presetType) => {
    setDifyPreset(presetType);
    if (presetType === 'magene_night') {
      setDifyUrl('https://night.magene.cn/v1');
      setDifyKey(BUILTIN_KEY_PLACEHOLDER);
      toast.info('已加载 [迈金 Night 专用引擎] 内置预设');
    } else if (presetType === 'dify_cloud') {
      setDifyUrl('https://api.dify.ai/v1');
      setDifyKey('');
      toast.info('已加载 [Dify 官方云服务] 内置预设 (Key 由后端托管)');
    } else if (presetType === 'custom') {
      toast.info('请在下方填写自定义 Dify 服务器地址与 Key');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        provider,
        openaiBaseUrl: openaiBaseUrl.replace(/\/$/, '').trim(),
        openaiApiKey: openaiApiKey ? openaiApiKey.trim() : undefined,
        openaiModel: openaiModel.trim(),
        difyBaseUrl: difyUrl.replace(/\/$/, '').trim(),
        difyApiKey: (difyKey && difyKey !== BUILTIN_KEY_PLACEHOLDER) ? difyKey.trim() : undefined
      };

      const res = await apiFetch('/api/projects/proj-default/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`AI 翻译配置保存成功！当前引擎: ${provider === 'openai' ? '大模型直连' : provider === 'dify' ? 'Dify 工作流' : '本地离线词库'}`);
        if (openaiApiKey) setHasOpenaiKey(true);
        if (difyKey) setHasDifyKey(true);
        if (onConnectionStatusChange) onConnectionStatusChange(true);
      } else {
        toast.error(`保存失败: ${data.error}`);
      }
    } catch (err) {
      toast.error(`保存异常: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // 触发一次测试翻译试跑
      const testRes = await apiFetch('/api/projects/proj-default/ai-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            KW: 'KW_TEST_CONNECT',
            zh_cn: '测试连接',
            target_languages: 'EN（英文）,FR（法）'
          }
        })
      });
      const data = await testRes.json();
      setTesting(false);
      if (testRes.ok && data) {
        toast.success('连接测试成功！AI 翻译响应极速可用。');
        if (onConnectionStatusChange) onConnectionStatusChange(true);
      } else {
        toast.error(`测试未通过: ${data?.error || '连接响应异常'}`);
      }
    } catch (err) {
      setTesting(false);
      toast.error(`请求异常: ${err.message}`);
    }
  };

  // Recycle Bin handlers
  const fetchRecycleItems = async () => {
    setLoadingRecycle(true);
    try {
      const res = await apiFetch('/api/projects/proj-default/recycle-bin');
      if (res.ok) {
        const data = await res.json();
        setRecycleItems(data);
      }
    } catch (err) {
      console.error('加载回收站数据失败:', err);
    } finally {
      setLoadingRecycle(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'recycle') {
      fetchRecycleItems();
    }
  }, [activeSubTab]);

  const handleRestore = async (id, name, type) => {
    const typeCn = type === 'version' ? '数据表' : type === 'language' ? '语种' : '词汇表';
    if (!window.confirm(`确定要恢复已删除的 ${typeCn} [${name}] 吗？恢复后所有关联数据及翻译将完整还原。`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/recycle-bin/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || '恢复数据成功！');
        fetchRecycleItems();
      } else {
        toast.error(data.error || '恢复失败');
      }
    } catch (err) {
      toast.error('网络请求异常: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePurge = async (id, name, type) => {
    const typeCn = type === 'version' ? '数据表' : type === 'language' ? '语种' : '词汇表';
    if (!window.confirm(`⚠️ 警示：彻底删除是毁灭性动作，将无法二次找回！\n您确定要彻底销毁被删除的 ${typeCn} [${name}] 吗？`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/recycle-bin/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || '数据已彻底销毁。');
        fetchRecycleItems();
      } else {
        toast.error(data.error || '彻底删除失败');
      }
    } catch (err) {
      toast.error('网络请求异常: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      {/* Header */}
      <div className="tab-header" style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>系统管理与设置</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>配置外部 AI 智能翻译连接，或在数据回收站中找回误删的历史字典数据。</p>
      </div>

      {/* Sub-tabs Selection */}
      {projectRole === 'owner' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexShrink: 0 }}>
          <button 
            onClick={() => setActiveSubTab('engine')}
            className={`btn ${activeSubTab === 'engine' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', height: '32px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            ⚡ 翻译引擎设置 (AI)
          </button>
          <button 
            onClick={() => setActiveSubTab('recycle')}
            className={`btn ${activeSubTab === 'recycle' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', height: '32px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            🗑️ 数据回收站
          </button>
        </div>
      )}

      {/* SUBTAB 1: AI Translation Engine */}
      {activeSubTab === 'engine' && (
        <div className="settings-container" style={{ maxWidth: '680px' }}>
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>智能多语言翻译引擎配置</span>
          </h3>
          
          {/* Engine Mode Selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            {/* Option 1: OpenAI / DeepSeek */}
            <div 
              onClick={() => setProvider('openai')}
              style={{
                padding: '0.9rem',
                borderRadius: '8px',
                border: `2px solid ${provider === 'openai' ? 'var(--accent)' : 'var(--border-color)'}`,
                backgroundColor: provider === 'openai' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent)' }} /> 大模型直连 (推荐)
                </span>
                {provider === 'openai' && <Check size={16} style={{ color: 'var(--accent)' }} />}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                支持 DeepSeek-V3、通义千问、OpenAI 等标准接口。耗时 &lt; 1.5s，免去 Dify 复杂维护。
              </p>
            </div>

            {/* Option 2: Dify Workflow */}
            <div 
              onClick={() => setProvider('dify')}
              style={{
                padding: '0.9rem',
                borderRadius: '8px',
                border: `2px solid ${provider === 'dify' ? 'var(--accent)' : 'var(--border-color)'}`,
                backgroundColor: provider === 'dify' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Globe size={16} style={{ color: '#0ea5e9' }} /> Dify 工作流
                </span>
                {provider === 'dify' && <Check size={16} style={{ color: 'var(--accent)' }} />}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                兼容现有迈金 Night / Dify 官方云服务工作流代理。
              </p>
            </div>

            {/* Option 3: Local Offline Dictionary */}
            <div 
              onClick={() => setProvider('local')}
              style={{
                padding: '0.9rem',
                borderRadius: '8px',
                border: `2px solid ${provider === 'local' ? 'var(--accent)' : 'var(--border-color)'}`,
                backgroundColor: provider === 'local' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Cpu size={16} style={{ color: '#10b981' }} /> 本地离线词典
                </span>
                {provider === 'local' && <Check size={16} style={{ color: 'var(--accent)' }} />}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                零网络请求、零 API 费用，完全基于内置固件硬件词库与本地专业术语表精准匹配。
              </p>
            </div>
          </div>

          {/* Form Content: Mode 1 - OpenAI / DeepSeek */}
          {provider === 'openai' && (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>快速加载大模型预设:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={() => handleApplyOpenaiPreset('deepseek')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    DeepSeek-V3
                  </button>
                  <button type="button" onClick={() => handleApplyOpenaiPreset('qwen')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    通义千问 (Qwen)
                  </button>
                  <button type="button" onClick={() => handleApplyOpenaiPreset('openai')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    OpenAI
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>API 基础地址 (Base URL)</label>
                <input 
                  type="text" 
                  value={openaiBaseUrl} 
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1" 
                  className="text-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>模型名称 (Model)</label>
                <input 
                  type="text" 
                  value={openaiModel} 
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="deepseek-chat 或 qwen-plus" 
                  className="text-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  API 密钥 (API Key)
                  {hasOpenaiKey && <span style={{ color: 'var(--green)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>● 已保存密钥</span>}
                </label>
                <input 
                  type="password" 
                  value={openaiApiKey} 
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={hasOpenaiKey ? "留空保持已存密钥，输入新密钥进行更新" : "sk-..."} 
                  className="text-input" 
                />
              </div>
            </div>
          )}

          {/* Form Content: Mode 2 - Dify */}
          {provider === 'dify' && (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dify 引擎预设:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={() => handleApplyDifyPreset('magene_night')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    迈金 Night
                  </button>
                  <button type="button" onClick={() => handleApplyDifyPreset('dify_cloud')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    Dify 官方云
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Dify 接口地址 (Base URL)</label>
                <input 
                  type="text" 
                  value={difyUrl} 
                  onChange={(e) => setDifyUrl(e.target.value)}
                  placeholder="https://night.magene.cn/v1" 
                  className="text-input" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Dify API Key (app-...)
                  {hasDifyKey && <span style={{ color: 'var(--green)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>● 已保存密钥</span>}
                </label>
                <input 
                  type="password" 
                  value={difyKey} 
                  onChange={(e) => setDifyKey(e.target.value)}
                  placeholder={difyKey === BUILTIN_KEY_PLACEHOLDER ? BUILTIN_KEY_PLACEHOLDER : (hasDifyKey ? "留空保持已存密钥" : "app-...")} 
                  className="text-input" 
                />
              </div>
            </div>
          )}

          {/* Form Content: Mode 3 - Local Dictionary */}
          {provider === 'local' && (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--green)' }}>
                <Check size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>纯本地离线翻译模式已就绪</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                该模式无需任何外部网络或 API 密钥。翻译时将精准提取项目内【专业词汇库】中的同义词和已规范术语；对于常见操作（如重试、确认、连接、配对、功率等），将直接从嵌入式固件高频词典中秒级生成，100% 成功、零等待。
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {projectRole === 'owner' && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                onClick={handleTest} 
                disabled={testing}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {testing ? <><Loader2 size={14} className="animate-spin" /> 测试连接中...</> : '⚡ 测试当前引擎连通性'}
              </button>
              
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> 保存中...</> : '💾 保存并应用此引擎配置'}
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>架构安全性说明</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              * 系统所有模型请求均由后端安全代理，API Key 密闭加密存储于数据库中，前端不暴露明文。<br />
              * 无论选择何种引擎，如果网络出现瞬间波动，后端均会自动调用本地专业词库兜底保障，避免翻译工作流被阻断。
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Recycle Bin */}
      {activeSubTab === 'recycle' && projectRole === 'owner' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div className="alert-box alert-box-warning" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', padding: '0.75rem 1rem', background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '4px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              数据回收站为防止误删的安全阀。删除的大表（版本）、语种或专业词汇表会临时保存在回收站中。<strong>30 天后到期条目将被系统自动彻底清理</strong>，期间支持一键无损还原。
            </span>
          </div>

          <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loadingRecycle ? (
              <div className="flex-center" style={{ flex: 1, gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={18} />
                <span style={{ fontSize: '0.85rem' }}>正在检索回收站历史数据...</span>
              </div>
            ) : recycleItems.length === 0 ? (
              <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)', padding: '4rem 0' }}>
                <span style={{ fontSize: '2.5rem' }}>🗑️</span>
                <span style={{ fontSize: '0.85rem' }}>回收站内空空如也，无任何待清理数据。</span>
              </div>
            ) : (
              <div style={{ overflow: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>类型</th>
                      <th style={{ padding: '0.75rem 1rem' }}>名称</th>
                      <th style={{ padding: '0.75rem 1rem' }}>删除操作人</th>
                      <th style={{ padding: '0.75rem 1rem' }}>删除时间</th>
                      <th style={{ padding: '0.75rem 1rem' }}>过期自动清除</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>操作选项</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recycleItems.map(item => {
                      const typeCn = item.entity_type === 'version' ? '固件大表' : item.entity_type === 'language' ? '翻译语种' : '词汇大表';
                      const badgeColor = item.entity_type === 'version' ? 'var(--accent)' : item.entity_type === 'language' ? 'var(--purple)' : 'var(--yellow)';
                      const isActionLoading = actionLoadingId === item.id;
                      
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: `1px solid ${badgeColor}`, color: badgeColor, borderRadius: '3px' }}>{typeCn}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.entity_name}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{item.deleted_by_name || '系统管理员'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{formatLocaleDateTime(item.deleted_at)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--red)', fontWeight: 500 }}>{formatLocaleDateTime(item.expires_at)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleRestore(item.id, item.entity_name, item.entity_type)}
                                disabled={isActionLoading}
                                className="btn btn-secondary"
                                style={{ height: '24px', padding: '0 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', borderColor: 'rgba(var(--accent-rgb), 0.3)', color: 'var(--accent)' }}
                              >
                                {isActionLoading ? <Loader2 className="animate-spin" size={10} /> : <RotateCcw size={10} />}
                                <span>一键恢复</span>
                              </button>
                              
                              <button 
                                onClick={() => handlePurge(item.id, item.entity_name, item.entity_type)}
                                disabled={isActionLoading}
                                className="btn btn-secondary"
                                style={{ height: '24px', padding: '0 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--red)' }}
                              >
                                {isActionLoading ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />}
                                <span>彻底删除</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
