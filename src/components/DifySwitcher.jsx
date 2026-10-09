import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Loader2, Sparkles, Cpu, Settings } from 'lucide-react';
import { getDifyDisplayLabel } from '../utils/difyLabels';
import { apiFetch } from '../utils/api';

// ============================================================
// DifySwitcher / AISwitcher — 顶部多引擎 AI 状态指示与快速切换器
//
// 支持三模：
// 1. 大模型直连 (DeepSeek-V3 / 通义千问 / OpenAI 兼容接口)
// 2. Dify 智能体工作流 (迈金 Night / 官方云 / 自定义实例)
// 3. 本地离线固件词典 (零网络依赖、内置术语表兜底)
// ============================================================

export default function DifySwitcher({
  baseUrl,
  connected,
  canSwitch,         // 当前用户是否有 owner 权限切换
  switching,         // 上层传入的"切换进行中"标志
  _onSwitch,         // (newBaseUrl: string) => Promise<boolean>
  onOpenSettings,    // () => void (打开设置页)
  aiConfig,          // { provider, openaiModel, openaiBaseUrl, hasOpenaiKey, difyBaseUrl, hasDifyKey }
  onRefreshAiState   // 刷新全局状态回调
}) {
  const [open, setOpen] = useState(false);
  const [localSwitching, setLocalSwitching] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  // 点击外部自动关闭
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const activeProvider = aiConfig?.provider || (baseUrl ? 'dify' : 'openai');
  const difyDisplayLabel = connected ? getDifyDisplayLabel(baseUrl || aiConfig?.difyBaseUrl) : '未配置';

  // 快捷切换 AI Provider
  async function handleQuickSwitchProvider(newProvider, extraPayload = {}) {
    if (!canSwitch || localSwitching) return;
    setLocalSwitching(true);
    setOpen(false);
    try {
      const payload = {
        provider: newProvider,
        ...extraPayload
      };
      const res = await apiFetch('/api/projects/proj-default/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (onRefreshAiState) await onRefreshAiState();
      }
    } catch (err) {
      console.error('切换 AI 引擎失败:', err);
    } finally {
      setLocalSwitching(false);
    }
  }

  // 渲染显示文本与图标
  let engineIcon = <Sparkles size={13} style={{ color: '#38bdf8' }} />;
  let engineLabel = 'AI: DeepSeek-V3';
  let isReady = true;

  if (activeProvider === 'openai') {
    engineIcon = <Sparkles size={13} style={{ color: '#38bdf8' }} />;
    const modelName = (aiConfig?.openaiModel || 'deepseek-chat').toUpperCase();
    engineLabel = `AI: ${modelName.length > 15 ? modelName.slice(0, 15) + '…' : modelName}`;
    isReady = true; // 即使无 key 也有离线词典兜底
  } else if (activeProvider === 'local') {
    engineIcon = <Cpu size={13} style={{ color: '#10b981' }} />;
    engineLabel = 'AI: 本地离线词库';
    isReady = true;
  } else {
    // dify
    engineIcon = <Globe size={13} style={{ color: '#818cf8' }} />;
    engineLabel = `Dify: ${difyDisplayLabel}`;
    isReady = Boolean(connected || aiConfig?.hasDifyKey);
  }

  const isBusy = switching || localSwitching;

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={isBusy}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={canSwitch ? '点击切换 AI 翻译引擎或打开详细设置' : '当前生效的 AI 翻译引擎'}
        style={{
          ...styles.trigger,
          opacity: isBusy ? 0.6 : 1,
          cursor: isBusy ? 'wait' : 'pointer',
        }}
      >
        {engineIcon}
        <span style={styles.statusLabel}>{engineLabel}</span>
        <span style={isReady ? styles.dotOn : styles.dotOff} />
        {isBusy
          ? <Loader2 size={11} className="animate-spin" style={{ marginLeft: '4px' }} />
          : <ChevronDown size={11} style={{
              marginLeft: '2px',
              transition: 'transform 150ms',
              transform: open ? 'rotate(180deg)' : 'rotate(0)',
            }} />
        }
      </button>

      {open && (
        <div role="listbox" style={styles.menu}>
          <div style={styles.menuHeader}>当前生效引擎: {activeProvider === 'openai' ? '大模型直连' : activeProvider === 'local' ? '本地离线词库' : 'Dify 智能体'}</div>

          {/* 模式 1: 大模型直连 */}
          <button
            type="button"
            role="option"
            aria-selected={activeProvider === 'openai'}
            onClick={() => handleQuickSwitchProvider('openai', { openaiModel: 'deepseek-chat', openaiBaseUrl: 'https://api.deepseek.com/v1' })}
            style={{
              ...styles.menuItem,
              background: activeProvider === 'openai' ? 'var(--bg-tertiary, rgba(56, 189, 248, 0.1))' : 'transparent',
            }}
          >
            <Sparkles size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: activeProvider === 'openai' ? 600 : 500, color: 'var(--text-primary)' }}>
                大模型直连 · DeepSeek-V3 / OpenAI
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                官方标准 API，速度极快，自带离线固件词库兜底
              </span>
            </div>
            {activeProvider === 'openai' && <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
          </button>

          {/* 模式 2: Dify 智能体 */}
          <button
            type="button"
            role="option"
            aria-selected={activeProvider === 'dify'}
            onClick={() => handleQuickSwitchProvider('dify')}
            style={{
              ...styles.menuItem,
              background: activeProvider === 'dify' ? 'var(--bg-tertiary, rgba(129, 140, 248, 0.1))' : 'transparent',
            }}
          >
            <Globe size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: activeProvider === 'dify' ? 600 : 500, color: 'var(--text-primary)' }}>
                Dify 智能体工作流 ({difyDisplayLabel})
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                迈金内部 Dify Agent / 官方云服务实例
              </span>
            </div>
            {activeProvider === 'dify' && <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
          </button>

          {/* 模式 3: 本地离线固件词库 */}
          <button
            type="button"
            role="option"
            aria-selected={activeProvider === 'local'}
            onClick={() => handleQuickSwitchProvider('local')}
            style={{
              ...styles.menuItem,
              background: activeProvider === 'local' ? 'var(--bg-tertiary, rgba(16, 185, 129, 0.1))' : 'transparent',
            }}
          >
            <Cpu size={14} style={{ color: '#10b981', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: activeProvider === 'local' ? 600 : 500, color: 'var(--text-primary)' }}>
                本地离线固件词典 (零网络依赖)
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                内置迈金码表 16 国语言高频固件术语库，100% 离线高可用
              </span>
            </div>
            {activeProvider === 'local' && <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
          </button>

          <div style={styles.menuFooter}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (onOpenSettings) onOpenSettings();
              }}
              style={styles.settingsLinkBtn}
            >
              <Settings size={12} />
              <span>打开完整引擎设置与 API 密钥管理</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = {
  wrap: {
    position: 'relative',
    display: 'inline-flex',
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '4px 8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm, 6px)',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    fontFamily: 'inherit',
    transition: 'background 150ms, border-color 150ms',
  },
  statusLabel: {
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  dotOn: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--green, #10b981)',
    boxShadow: '0 0 6px var(--green, #10b981)',
  },
  dotOff: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--red, #ef4444)',
    boxShadow: '0 0 6px var(--red, #ef4444)',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: '290px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md, 8px)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
    zIndex: 100,
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  menuHeader: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    padding: '6px 10px 4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '2px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 'var(--radius-sm, 6px)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background 120ms',
  },
  menuFooter: {
    padding: '6px 8px 2px',
    borderTop: '1px solid var(--border-color)',
    marginTop: '4px',
  },
  settingsLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 8px',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--accent-color, #38bdf8)',
    fontSize: '0.72rem',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  }
};