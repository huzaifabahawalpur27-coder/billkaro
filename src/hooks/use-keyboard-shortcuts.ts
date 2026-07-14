"use client";

import { useEffect, useRef } from "react";

export interface ShortcutBinding {
  /** Key name compared against KeyboardEvent.key, case-insensitive (e.g. "F2", "/"). */
  key: string;
  handler: (e: KeyboardEvent) => void;
  /** Fire even when an input/textarea/select is focused (F-keys should set this). */
  allowInInputs?: boolean;
}

/**
 * Single window keydown listener for page-level hotkeys. Bindings are read
 * through a ref so handlers always see fresh state without re-subscribing.
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  const bindingsRef = useRef(bindings);
  useEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target?.isContentEditable ?? false);

      for (const binding of bindingsRef.current) {
        if (binding.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if (inField && !binding.allowInInputs) continue;
        e.preventDefault();
        binding.handler(e);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
