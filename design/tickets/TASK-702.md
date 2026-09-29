# 【TASK-702】硬件屏幕 max_chars 动态三色仪表盘指示器

*   **工单编号**：`TASK-702`
*   **所属 Epic**：`Epic 7: 沉浸式 CAT 译员工作台与硬件上下文`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：前端 UI/UX 工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-701`](./TASK-701.md), [`TASK-601`](./TASK-601.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 翻译人员与硬件测试工程师，  
> **我需要** 在输入框右下角直观看到当前译文字符数与物理屏幕上限（`max_chars`）的比值，并由基于 HeroUI `Meter` 组件的三色刻度条（绿色安全 / 琥珀警告 / 红色爆框并伴随呼吸光晕）实时反馈，  
> **以便于** 在打字瞬间即可知晓是否存在硬件物理溢出截断风险，杜绝发版后在码表或心率带屏幕上出现尴尬的换行截断乱码。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/components/ui/HardwareConstraintMeter.tsx` (动态刻度条核心组件)
*   `client/test/components/hardware-meter.test.tsx` (三色阈值与溢出抖动测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 刻度条阈值与视觉规则
```typescript
// client/src/components/ui/HardwareConstraintMeter.tsx
export const HardwareConstraintMeter: React.FC<{ currentLength: number; maxChars: number }> = ({
  currentLength,
  maxChars,
}) => {
  if (!maxChars || maxChars <= 0) return null;

  const percentage = Math.min(Math.round((currentLength / maxChars) * 100), 150);
  const isOverflow = currentLength > maxChars;
  const isWarning = percentage >= 70 && !isOverflow;
  const color = isOverflow ? 'danger' : isWarning ? 'warning' : 'success';

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <Meter
        aria-label="硬件字符上限"
        value={percentage}
        color={color}
        size="sm"
        classNames={{
          base: 'max-w-[140px]',
          track: 'bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full',
          indicator: isOverflow ? 'animate-pulse' : '',
        }}
      />
      <span className={`text-xs font-mono font-medium ${
        isOverflow ? 'text-rose-500 font-bold' : isWarning ? 'text-amber-500' : 'text-slate-400'
      }`}>
        {currentLength} / {maxChars} 字符
        {isOverflow && <span className="ml-1 text-[11px] text-rose-500">(⚠️ 溢出 {currentLength - maxChars})</span>}
      </span>
    </div>
  );
};
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 当前字符 $<70\%$ 时，刻度条呈翡翠绿色；
- [ ] 达到 $70\% \sim 100\%$ 时，刻度条动态切换为琥珀黄色；
- [ ] 超过 $100\%$ 时，刻度条切换为危险玫瑰红，并触发 `animate-pulse` 警示闪烁，文字明确提示 `(⚠️ 溢出 N)`;
- [ ] 当词条未设置 `max_chars` 时，组件优雅静默不渲染，无报错。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:hardware-meter
```

---

## 6. 完成定义 (Definition of Done)
1. 边界值计算（0 字符、满字符、溢出字符）测试全覆盖；
2. 严格满足 WCAG AAA 对比度要求。
