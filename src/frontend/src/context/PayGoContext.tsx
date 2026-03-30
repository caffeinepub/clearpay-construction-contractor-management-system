import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export type PayGoProject = {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: "Active" | "Completed";
  notes: string;
};

export type PayGoContractor = {
  id: string;
  name: string;
  trade: string;
  project: string;
  contractingPrice: number;
  unit: string;
  contact: string;
  email: string;
  address: string;
  notes: string;
  status: "Active" | "Completed";
};

export type PayGoPayment = {
  id: string;
  paymentNo: string;
  project: string;
  date: string;
  amount: number;
  paymentMode: "Account" | "Cash";
  reference: string;
  remarks: string;
  status: "Pending" | "Completed" | "Partial";
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`paygo_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`paygo_${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type PayGoContextValue = {
  projects: PayGoProject[];
  contractors: PayGoContractor[];
  payments: PayGoPayment[];
  addProject: (p: Omit<PayGoProject, "id">) => void;
  updateProject: (p: PayGoProject) => void;
  deleteProject: (id: string) => void;
  addContractor: (c: Omit<PayGoContractor, "id">) => void;
  updateContractor: (c: PayGoContractor) => void;
  deleteContractor: (id: string) => void;
  addPayment: (p: Omit<PayGoPayment, "id" | "paymentNo">) => void;
  updatePayment: (p: PayGoPayment) => void;
  deletePayment: (id: string) => void;
};

const PayGoContext = createContext<PayGoContextValue | null>(null);

export function PayGoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<PayGoProject[]>(() =>
    loadFromStorage("projects", [
      {
        id: "pg1",
        name: "Sunrise Towers",
        client: "ABC Developers",
        startDate: "2025-01-15",
        endDate: "2026-06-30",
        budget: 5000000,
        status: "Active",
        notes: "20-floor residential complex",
      },
      {
        id: "pg2",
        name: "Green Valley Roads",
        client: "Municipal Corp",
        startDate: "2024-09-01",
        endDate: "2025-12-31",
        budget: 2500000,
        status: "Active",
        notes: "Road widening project",
      },
      {
        id: "pg3",
        name: "Industrial Shed A",
        client: "XYZ Manufacturing",
        startDate: "2024-06-01",
        endDate: "2025-03-31",
        budget: 1200000,
        status: "Completed",
        notes: "Factory shed construction",
      },
    ]),
  );

  const [contractors, setContractors] = useState<PayGoContractor[]>(() =>
    loadFromStorage("contractors", [
      {
        id: "c1",
        name: "Ramesh & Sons",
        trade: "Mason",
        project: "Sunrise Towers",
        contractingPrice: 850000,
        unit: "Sft",
        contact: "9876543210",
        email: "ramesh@example.com",
        address: "Hyderabad",
        notes: "",
        status: "Active",
      },
      {
        id: "c2",
        name: "Kumar Scaffolding",
        trade: "Scaffolding",
        project: "Green Valley Roads",
        contractingPrice: 350000,
        unit: "Rmtr",
        contact: "9988776655",
        email: "kumar@example.com",
        address: "Secunderabad",
        notes: "",
        status: "Active",
      },
    ]),
  );

  const [payments, setPayments] = useState<PayGoPayment[]>(() =>
    loadFromStorage("payments", [
      {
        id: "pmt1",
        paymentNo: "PG-001",
        project: "Sunrise Towers",
        date: "2025-03-01",
        amount: 500000,
        paymentMode: "Account",
        reference: "NEFT/2025/001",
        remarks: "First milestone",
        status: "Completed",
      },
      {
        id: "pmt2",
        paymentNo: "PG-002",
        project: "Green Valley Roads",
        date: "2025-03-10",
        amount: 250000,
        paymentMode: "Cash",
        reference: "",
        remarks: "Advance payment",
        status: "Completed",
      },
      {
        id: "pmt3",
        paymentNo: "PG-003",
        project: "Sunrise Towers",
        date: "2025-03-20",
        amount: 300000,
        paymentMode: "Account",
        reference: "NEFT/2025/045",
        remarks: "Second installment",
        status: "Pending",
      },
    ]),
  );

  const addProject = useCallback((p: Omit<PayGoProject, "id">) => {
    setProjects((prev) => {
      const next = [...prev, { ...p, id: genId() }];
      saveToStorage("projects", next);
      return next;
    });
  }, []);

  const updateProject = useCallback((p: PayGoProject) => {
    setProjects((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      saveToStorage("projects", next);
      return next;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("projects", next);
      return next;
    });
  }, []);

  const addContractor = useCallback((c: Omit<PayGoContractor, "id">) => {
    setContractors((prev) => {
      const next = [...prev, { ...c, id: genId() }];
      saveToStorage("contractors", next);
      return next;
    });
  }, []);

  const updateContractor = useCallback((c: PayGoContractor) => {
    setContractors((prev) => {
      const next = prev.map((x) => (x.id === c.id ? c : x));
      saveToStorage("contractors", next);
      return next;
    });
  }, []);

  const deleteContractor = useCallback((id: string) => {
    setContractors((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("contractors", next);
      return next;
    });
  }, []);

  const addPayment = useCallback(
    (p: Omit<PayGoPayment, "id" | "paymentNo">) => {
      setPayments((prev) => {
        const nextNo = `PG-${String(prev.length + 1).padStart(3, "0")}`;
        const next = [...prev, { ...p, id: genId(), paymentNo: nextNo }];
        saveToStorage("payments", next);
        return next;
      });
    },
    [],
  );

  const updatePayment = useCallback((p: PayGoPayment) => {
    setPayments((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      saveToStorage("payments", next);
      return next;
    });
  }, []);

  const deletePayment = useCallback((id: string) => {
    setPayments((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("payments", next);
      return next;
    });
  }, []);

  return (
    <PayGoContext.Provider
      value={{
        projects,
        contractors,
        payments,
        addProject,
        updateProject,
        deleteProject,
        addContractor,
        updateContractor,
        deleteContractor,
        addPayment,
        updatePayment,
        deletePayment,
      }}
    >
      {children}
    </PayGoContext.Provider>
  );
}

export function usePayGo(): PayGoContextValue {
  const ctx = useContext(PayGoContext);
  if (!ctx) throw new Error("usePayGo must be inside PayGoProvider");
  return ctx;
}
