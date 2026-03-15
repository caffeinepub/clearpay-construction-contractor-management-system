import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

/**
 * Low-level hook that binds keyboard shortcuts to callbacks.
 * Each key in the map is a shortcut string like "ctrl+n" or "alt+p".
 * Cleans up on unmount.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  options: { skipOnInput?: boolean } = {},
) {
  const { skipOnInput = true } = options;

  // biome-ignore lint/correctness/useExhaustiveDependencies: shortcuts object identity intentionally excluded
  useEffect(() => {
    const normalize = (e: KeyboardEvent): string => {
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      parts.push(e.key.toLowerCase());
      return parts.join("+");
    };

    const isInputEl = () => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      return ["input", "textarea", "select"].includes(tag);
    };

    const handler = (e: KeyboardEvent) => {
      if (skipOnInput && isInputEl()) return;
      const combo = normalize(e);
      const cb = shortcuts[combo];
      if (cb) {
        e.preventDefault();
        cb();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [skipOnInput]);
}
