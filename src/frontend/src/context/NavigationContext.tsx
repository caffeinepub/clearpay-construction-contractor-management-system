import { createContext, useContext, useState } from "react";

export type Page =
  | "dashboard"
  | "analytics"
  | "projects"
  | "bills"
  | "payments"
  | "clients"
  | "users"
  | "reports"
  | "seri-ai";

interface NavigationContextValue {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  children,
}: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  return (
    <NavigationContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx)
    throw new Error("useNavigation must be used inside NavigationProvider");
  return ctx;
}
