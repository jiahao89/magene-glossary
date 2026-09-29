import { useEffect } from 'react';

export interface ShortcutHandlers {
  onStepNext?: () => void; // J
  onStepPrev?: () => void; // K
  onSaveAndNext?: () => void; // Ctrl + Enter
  onAcceptTM?: () => void; // Alt + 1
  onAcceptAI?: () => void; // Alt + 2
  onToggleHistory?: () => void; // Alt + H
}

/**
 * Global Keyboard Flow Listener (TASK-701)
 * Enables keyboard-first flow state navigation for professional translators.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl + Enter (or Cmd + Enter on Mac) -> Save and Step Next
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.onSaveAndNext?.();
        return;
      }

      // Alt + 1 -> Adopt TM Suggestion 1
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        handlers.onAcceptTM?.();
        return;
      }

      // Alt + 2 -> Adopt AI Suggestion 1
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        handlers.onAcceptAI?.();
        return;
      }

      // Alt + H -> Toggle History Audit Drawer
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handlers.onToggleHistory?.();
        return;
      }

      // When focused in text inputs, avoid hijacking standard typing of 'j' and 'k'
      if (isInputFocused) return;

      // 'J' or ArrowDown -> Step Next
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        handlers.onStepNext?.();
        return;
      }

      // 'K' or ArrowUp -> Step Prev
      if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlers.onStepPrev?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
