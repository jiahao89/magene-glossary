# 【TASK-604】单元格局部原子状态隔离与打字零重绘

*   **工单编号**：`TASK-604`
*   **所属 Epic**：`Epic 6: 前端设计系统与虚拟大网格`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：前端高级工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-603`](./TASK-603.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 高频打字录入的词条翻译人员与校对人员，  
> **我需要** 在虚拟网格中编辑任一语言的译文单元格时，打字操作仅触发该独立单元格的局部重绘，绝对不引起同行的其他 15+ 语种单元格或视口内其他行的重复渲染，  
> **以便于** 输入延迟控制在 8ms 以内，完全达到本地原生桌面软件级别的极致跟手打字体验。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/components/grid/TermCell.tsx` (基于 React.memo 与独立受控状态的原子单元格)
*   `client/src/components/grid/CellInputOverlay.tsx` (单元格聚焦激活浮层)
*   `client/test/components/cell-rerender.test.tsx` (单元格局部重渲染 Profiler 测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 状态原子隔离设计
```typescript
// client/src/components/grid/TermCell.tsx
export const TermCell = React.memo<TermCellProps>(({ termId, lang, initialValue, isLocked, onSave }) => {
  // 核心：单元格内部独立原子状态，打字时不触发父级或同级兄弟组件重绘
  const [value, setValue] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);

  // 1500ms 防抖同步或失去焦点即时提交
  const debouncedSave = useDebouncedCallback((val) => {
    onSave(termId, lang, val);
    setIsDirty(false);
  }, 1500);

  return (
    <div className={`p-2 h-full flex items-center ${isDirty ? 'bg-primary-500/5' : ''}`}>
      <input
        disabled={isLocked}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsDirty(true);
          debouncedSave(e.target.value);
        }}
        className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5"
      />
    </div>
  );
}, (prev, next) => {
  // 严格比对：仅当自身值或锁定状态改变时重绘
  return prev.initialValue === next.initialValue && prev.isLocked === next.isLocked;
});
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 使用 React Profiler 录制单单元格高频打字，当前视口内其他所有单元格的渲染次数恒为 0；
- [ ] 打字输入至画面响应延迟 $\le 8\text{ms}$；
- [ ] 连续打字暂停 1.5 秒后，自动静默触发持久化保存；
- [ ] 单元格失去焦点（`onBlur`）时，立即冲刷缓冲区执行落库。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:cell-rerender
```

---

## 6. 完成定义 (Definition of Done)
1. React Profiler 重绘次数测试断言通过；
2. 单元格防抖与即时保存逻辑无冲突。
