import { useEffect } from "react";
import {
  type PageShortcutHandlers,
  useShortcutContext,
} from "../context/ShortcutContext";

/**
 * Call this hook in any page component to register keyboard shortcut handlers.
 * Handlers are automatically unregistered when the component unmounts.
 *
 * @example
 * usePageShortcuts({
 *   newForm: () => setIsFormOpen(true),
 *   clearFilters: handleClearFilters,
 *   refreshList: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
 * });
 */
export function usePageShortcuts(handlers: PageShortcutHandlers) {
  const { registerHandlers, unregisterHandlers } = useShortcutContext();

  // Mount/unmount lifecycle
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on mount/unmount
  useEffect(() => {
    registerHandlers(handlers);
    return () => {
      unregisterHandlers();
    };
  }, [registerHandlers, unregisterHandlers]);

  // Keep handlers ref up to date on every render
  useEffect(() => {
    registerHandlers(handlers);
  });
}
