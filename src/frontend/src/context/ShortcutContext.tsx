import { canManageData } from "@/lib/authAdmin";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { type Page, useNavigation } from "./NavigationContext";

export interface PageShortcutHandlers {
  newForm?: () => void;
  saveForm?: () => void;
  saveAndClose?: () => void;
  saveAndNew?: () => void;
  closeModal?: () => void;
  editSelected?: () => void;
  deleteSelected?: () => void;
  selectAll?: () => void;
  bulkDelete?: () => void;
  importCSV?: () => void;
  exportCSV?: () => void;
  exportPDF?: () => void;
  downloadFormat?: () => void;
  clearFilters?: () => void;
  resetFilters?: () => void;
  refreshList?: () => void;
  focusSearch?: () => void;
  print?: () => void;
}

interface ShortcutContextValue {
  registerHandlers: (handlers: PageShortcutHandlers) => void;
  unregisterHandlers: () => void;
  setFormOpen: (open: boolean) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

const isInputFocused = (): boolean => {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return true;
  if ((el as HTMLElement).contentEditable === "true") return true;
  if (el.getAttribute("role") === "textbox") return true;
  return false;
};

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<PageShortcutHandlers>({});
  const isFormOpenRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const { setCurrentPage } = useNavigation();
  const { data: userProfile } = useGetCallerUserProfile();
  const { isMasterAdmin } = useMasterAdmin();

  const isAdmin =
    isMasterAdmin ||
    canManageData(userProfile?.email, userProfile?.role as string | undefined);

  // Keep refs so the stable keydown listener always has latest values
  const isAdminRef = useRef(isAdmin);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  const navigateToRef = useRef<(page: Page) => void>(() => {});
  useEffect(() => {
    navigateToRef.current = (page: Page) => {
      if (page === "users" && !isAdminRef.current) return;
      setCurrentPage(page);
    };
  }, [setCurrentPage]);

  const registerHandlers = useCallback((handlers: PageShortcutHandlers) => {
    handlersRef.current = handlers;
    forceUpdate((n) => n + 1);
  }, []);

  const unregisterHandlers = useCallback(() => {
    handlersRef.current = {};
  }, []);

  const setFormOpen = useCallback((open: boolean) => {
    isFormOpenRef.current = open;
  }, []);

  // Stable listener — added once, never removed/re-added
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      const inputFocused = isInputFocused();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // ── Ctrl+Backspace: clear focused input field ──────────────────────────
      if (ctrl && e.key === "Backspace" && inputFocused) {
        (document.activeElement as HTMLInputElement).value = "";
        e.preventDefault();
        return;
      }

      // ── Esc: always close modal ────────────────────────────────────────────
      if (e.key === "Escape") {
        if (h.closeModal) {
          h.closeModal();
          e.preventDefault();
        }
        return;
      }

      // ── Alt navigation shortcuts (always fire) ────────────────────────────
      if (alt && !ctrl) {
        const navMap: Record<string, Page> = {
          d: "dashboard",
          p: "projects",
          b: "bills",
          m: "payments",
          u: "users",
          c: "clients",
          a: "analytics",
          r: "reports",
          s: "seri-ai",
        };
        const target = navMap[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          if (target === "seri-ai") {
            window.dispatchEvent(new CustomEvent("open-seri-ai"));
          } else {
            navigateToRef.current(target);
          }
        }
        return;
      }

      // ── Block global shortcuts when input is focused (except Esc & Alt) ───
      if (inputFocused) return;

      // ── Form shortcuts (when form is open) ────────────────────────────────
      if (isFormOpenRef.current) {
        if (ctrl && shift && e.key.toLowerCase() === "s" && h.saveAndClose) {
          e.preventDefault();
          h.saveAndClose();
          return;
        }
        if (ctrl && shift && e.key.toLowerCase() === "n" && h.saveAndNew) {
          e.preventDefault();
          h.saveAndNew();
          return;
        }
        if (ctrl && e.key === "Enter" && h.saveForm) {
          e.preventDefault();
          h.saveForm();
          return;
        }
      }

      // ── Global action shortcuts ────────────────────────────────────────────
      if (!ctrl) return;

      if (shift) {
        switch (e.key.toLowerCase()) {
          case "d":
            e.preventDefault();
            h.bulkDelete?.();
            return;
          case "e":
            e.preventDefault();
            h.exportCSV?.();
            return;
          case "p":
            e.preventDefault();
            h.exportPDF?.();
            return;
          case "f":
            e.preventDefault();
            h.downloadFormat?.();
            return;
          case "c":
            e.preventDefault();
            h.clearFilters?.();
            return;
          case "r":
            e.preventDefault();
            h.resetFilters?.();
            return;
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          h.newForm?.();
          return;
        case "s":
          e.preventDefault();
          h.saveForm?.();
          return;
        case "p":
          e.preventDefault();
          h.print?.();
          return;
        case "f":
          e.preventDefault();
          h.focusSearch?.();
          return;
        case "r":
          e.preventDefault();
          h.refreshList?.();
          return;
        case "e":
          e.preventDefault();
          h.editSelected?.();
          return;
        case "d":
          e.preventDefault();
          h.deleteSelected?.();
          return;
        case "a":
          e.preventDefault();
          h.selectAll?.();
          return;
        case "i":
          e.preventDefault();
          h.importCSV?.();
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // empty deps — listener added once and never re-added

  return (
    <ShortcutContext.Provider
      value={{ registerHandlers, unregisterHandlers, setFormOpen }}
    >
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcutContext(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext);
  if (!ctx)
    throw new Error("useShortcutContext must be used inside ShortcutProvider");
  return ctx;
}
