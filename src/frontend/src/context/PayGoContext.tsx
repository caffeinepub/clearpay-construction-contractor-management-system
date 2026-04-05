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
  unitPrice: number;
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

export type WorkflowStep = {
  step: "PM" | "QC" | "Billing Engineer";
  action: "Approved" | "Rejected" | "Added Debit";
  remarks: string;
  debitAmount?: number;
  reasonForDebit?: string;
  timestamp: string;
};

export type PayGoBill = {
  id: string;
  billNo: string;
  project: string;
  contractor: string;
  trade: string;
  blockId: string;
  date: string;
  // Extended fields
  description: string;
  unit: string;
  unitPrice: number;
  qty: number;
  nos: number;
  grossAmount: number;
  debitAmount: number;
  reasonForDebit: string;
  workRetention: number;
  retentionAmount: number;
  netAmount: number;
  remarks: string;
  attachment1: string;
  attachment2: string;
  engineerName: string;
  // Workflow
  workflowStatus:
    | "Pending PM Review"
    | "PM Approved"
    | "QC Approved"
    | "Billing Approved"
    | "Rejected";
  workflowHistory: WorkflowStep[];
  // Payment tracking
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "Unpaid" | "Partially Paid" | "Completed";
  // Backward compat
  amount: number;
  status: "Pending" | "Approved" | "Paid" | "Rejected";
  year: string;
  financialYear: string;
};

export type PayGoNMRBill = {
  id: string;
  billNo: string;
  project: string;
  contractor: string;
  trade: string;
  weekFrom: string;
  weekTo: string;
  labourCount: number;
  totalDays: number;
  ratePerDay: number;
  totalAmount: number;
  status: "Pending" | "Approved" | "Paid";
  remarks: string;
  year: string;
  financialYear: string;
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
  bills: PayGoBill[];
  nmrBills: PayGoNMRBill[];
  addProject: (p: Omit<PayGoProject, "id">) => void;
  updateProject: (p: PayGoProject) => void;
  deleteProject: (id: string) => void;
  addContractor: (c: Omit<PayGoContractor, "id">) => void;
  updateContractor: (c: PayGoContractor) => void;
  deleteContractor: (id: string) => void;
  addPayment: (p: Omit<PayGoPayment, "id" | "paymentNo">) => void;
  updatePayment: (p: PayGoPayment) => void;
  deletePayment: (id: string) => void;
  addBill: (b: Omit<PayGoBill, "id" | "billNo">) => void;
  updateBill: (b: PayGoBill) => void;
  deleteBill: (id: string) => void;
  updateBillWorkflow: (
    id: string,
    step: WorkflowStep["step"],
    action: WorkflowStep["action"],
    remarks: string,
    debitAmount?: number,
    reasonForDebit?: string,
  ) => void;
  payBill: (id: string, payAmount: number) => void;
  addNMRBill: (b: Omit<PayGoNMRBill, "id" | "billNo">) => void;
  updateNMRBill: (b: PayGoNMRBill) => void;
  deleteNMRBill: (id: string) => void;
};

const PayGoContext = createContext<PayGoContextValue | null>(null);

const SEED_BILLS: PayGoBill[] = [
  {
    id: "b1",
    billNo: "SU001",
    project: "Sunrise Towers",
    contractor: "Ramesh & Sons",
    trade: "Mason",
    blockId: "BLK-A1",
    date: "2025-01-10",
    description: "Block A foundation masonry work",
    unit: "Sft",
    unitPrice: 1000,
    qty: 100,
    nos: 1,
    grossAmount: 100000,
    debitAmount: 0,
    reasonForDebit: "",
    workRetention: 5,
    retentionAmount: 5000,
    netAmount: 95000,
    remarks: "Block A foundation work",
    attachment1: "",
    attachment2: "",
    engineerName: "Admin",
    workflowStatus: "Billing Approved",
    workflowHistory: [
      {
        step: "PM",
        action: "Approved",
        remarks: "Looks good",
        timestamp: "2025-01-12T10:00:00.000Z",
      },
      {
        step: "QC",
        action: "Approved",
        remarks: "Quality verified",
        timestamp: "2025-01-14T14:00:00.000Z",
      },
      {
        step: "Billing Engineer",
        action: "Approved",
        remarks: "Approved for payment",
        timestamp: "2025-01-15T09:00:00.000Z",
      },
    ],
    paidAmount: 0,
    remainingAmount: 95000,
    paymentStatus: "Unpaid",
    amount: 95000,
    status: "Approved",
    year: "2025",
    financialYear: "2024-25",
  },
  {
    id: "b2",
    billNo: "GR001",
    project: "Green Valley Roads",
    contractor: "Kumar Scaffolding",
    trade: "Scaffolding",
    blockId: "BLK-R2",
    date: "2025-02-05",
    description: "Road section 2 scaffolding",
    unit: "Rft",
    unitPrice: 850,
    qty: 100,
    nos: 1,
    grossAmount: 85000,
    debitAmount: 0,
    reasonForDebit: "",
    workRetention: 5,
    retentionAmount: 4250,
    netAmount: 80750,
    remarks: "Road section 2",
    attachment1: "",
    attachment2: "",
    engineerName: "Admin",
    workflowStatus: "Billing Approved",
    workflowHistory: [
      {
        step: "PM",
        action: "Approved",
        remarks: "Approved",
        timestamp: "2025-02-07T10:00:00.000Z",
      },
      {
        step: "QC",
        action: "Approved",
        remarks: "Approved",
        timestamp: "2025-02-09T10:00:00.000Z",
      },
      {
        step: "Billing Engineer",
        action: "Approved",
        remarks: "Approved",
        timestamp: "2025-02-10T10:00:00.000Z",
      },
    ],
    paidAmount: 80750,
    remainingAmount: 0,
    paymentStatus: "Completed",
    amount: 80750,
    status: "Paid",
    year: "2025",
    financialYear: "2024-25",
  },
  {
    id: "b3",
    billNo: "SU002",
    project: "Sunrise Towers",
    contractor: "Ramesh & Sons",
    trade: "Mason",
    blockId: "BLK-B2",
    date: "2025-03-15",
    description: "Block B walls masonry",
    unit: "Sft",
    unitPrice: 1000,
    qty: 98,
    nos: 1,
    grossAmount: 98000,
    debitAmount: 0,
    reasonForDebit: "",
    workRetention: 5,
    retentionAmount: 4900,
    netAmount: 93100,
    remarks: "Block B walls",
    attachment1: "",
    attachment2: "",
    engineerName: "Admin",
    workflowStatus: "Pending PM Review",
    workflowHistory: [],
    paidAmount: 0,
    remainingAmount: 93100,
    paymentStatus: "Unpaid",
    amount: 93100,
    status: "Pending",
    year: "2025",
    financialYear: "2024-25",
  },
  {
    id: "b4",
    billNo: "IN001",
    project: "Industrial Shed A",
    contractor: "Kumar Scaffolding",
    trade: "Scaffolding",
    blockId: "BLK-S1",
    date: "2025-04-01",
    description: "Shed structure scaffolding",
    unit: "Sft",
    unitPrice: 620,
    qty: 100,
    nos: 1,
    grossAmount: 62000,
    debitAmount: 0,
    reasonForDebit: "",
    workRetention: 5,
    retentionAmount: 3100,
    netAmount: 58900,
    remarks: "Shed structure",
    attachment1: "",
    attachment2: "",
    engineerName: "Admin",
    workflowStatus: "PM Approved",
    workflowHistory: [
      {
        step: "PM",
        action: "Approved",
        remarks: "Approved",
        timestamp: "2025-04-03T10:00:00.000Z",
      },
    ],
    paidAmount: 0,
    remainingAmount: 58900,
    paymentStatus: "Unpaid",
    amount: 58900,
    status: "Pending",
    year: "2025",
    financialYear: "2025-26",
  },
];

const SEED_NMR: PayGoNMRBill[] = [
  {
    id: "n1",
    billNo: "NMR-001",
    project: "Sunrise Towers",
    contractor: "Ramesh & Sons",
    trade: "Mason",
    weekFrom: "2025-01-06",
    weekTo: "2025-01-12",
    labourCount: 10,
    totalDays: 6,
    ratePerDay: 750,
    totalAmount: 45000,
    status: "Approved",
    remarks: "Week 2 labour",
    year: "2025",
    financialYear: "2024-25",
  },
  {
    id: "n2",
    billNo: "NMR-002",
    project: "Green Valley Roads",
    contractor: "Kumar Scaffolding",
    trade: "Scaffolding",
    weekFrom: "2025-02-03",
    weekTo: "2025-02-09",
    labourCount: 8,
    totalDays: 5,
    ratePerDay: 700,
    totalAmount: 28000,
    status: "Paid",
    remarks: "Week 6 road labour",
    year: "2025",
    financialYear: "2024-25",
  },
];

const SEED_PROJECTS: PayGoProject[] = [
  {
    id: "proj1",
    name: "Sunrise Towers",
    client: "Sunrise Developers",
    startDate: "2024-09-01",
    endDate: "2026-03-31",
    budget: 5000000,
    unitPrice: 1000,
    status: "Active",
    notes: "High-rise residential project",
  },
  {
    id: "proj2",
    name: "Green Valley Roads",
    client: "GV Infrastructure",
    startDate: "2024-11-01",
    endDate: "2025-10-31",
    budget: 2000000,
    unitPrice: 850,
    status: "Active",
    notes: "Road expansion project",
  },
  {
    id: "proj3",
    name: "Industrial Shed A",
    client: "Apex Industries",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    budget: 1500000,
    unitPrice: 620,
    status: "Active",
    notes: "Industrial warehouse construction",
  },
];

const SEED_CONTRACTORS: PayGoContractor[] = [
  {
    id: "c1",
    name: "Ramesh & Sons",
    trade: "Mason",
    project: "Sunrise Towers",
    contractingPrice: 1000,
    unit: "Sft",
    contact: "9876543210",
    email: "ramesh@example.com",
    address: "Chennai, TN",
    notes: "",
    status: "Active",
  },
  {
    id: "c2",
    name: "Kumar Scaffolding",
    trade: "Scaffolding",
    project: "Green Valley Roads",
    contractingPrice: 850,
    unit: "Rft",
    contact: "9876500001",
    email: "kumar@example.com",
    address: "Hyderabad, TS",
    notes: "",
    status: "Active",
  },
  {
    id: "c3",
    name: "Kumar Scaffolding",
    trade: "M S",
    project: "Industrial Shed A",
    contractingPrice: 620,
    unit: "Sft",
    contact: "9876500001",
    email: "kumar@example.com",
    address: "Hyderabad, TS",
    notes: "",
    status: "Active",
  },
  {
    id: "c4",
    name: "Ramesh & Sons",
    trade: "Bar bending",
    project: "Sunrise Towers",
    contractingPrice: 1200,
    unit: "Kg",
    contact: "9876543210",
    email: "ramesh@example.com",
    address: "Chennai, TN",
    notes: "",
    status: "Active",
  },
];

const SEED_PAYMENTS: PayGoPayment[] = [
  {
    id: "pmt1",
    paymentNo: "PG-001",
    project: "Sunrise Towers",
    date: "2025-02-01",
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
];

export function PayGoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<PayGoProject[]>(() =>
    loadFromStorage("projects", SEED_PROJECTS),
  );

  const [contractors, setContractors] = useState<PayGoContractor[]>(() =>
    loadFromStorage("contractors", SEED_CONTRACTORS),
  );

  const [payments, setPayments] = useState<PayGoPayment[]>(() =>
    loadFromStorage("payments", SEED_PAYMENTS),
  );

  const [bills, setBills] = useState<PayGoBill[]>(() =>
    loadFromStorage("bills", SEED_BILLS),
  );

  const [nmrBills, setNMRBills] = useState<PayGoNMRBill[]>(() =>
    loadFromStorage("nmrBills", SEED_NMR),
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

  const addBill = useCallback((b: Omit<PayGoBill, "id" | "billNo">) => {
    setBills((prev) => {
      const prefix = b.project.slice(0, 2).toUpperCase();
      const projectBills = prev.filter((x) => x.billNo.startsWith(prefix));
      const nextSeq = projectBills.length + 1;
      const billNo = `${prefix}${String(nextSeq).padStart(3, "0")}`;
      const next = [...prev, { ...b, id: genId(), billNo }];
      saveToStorage("bills", next);
      return next;
    });
  }, []);

  const updateBill = useCallback((b: PayGoBill) => {
    setBills((prev) => {
      const next = prev.map((x) => (x.id === b.id ? b : x));
      saveToStorage("bills", next);
      return next;
    });
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("bills", next);
      return next;
    });
  }, []);

  const updateBillWorkflow = useCallback(
    (
      id: string,
      step: WorkflowStep["step"],
      action: WorkflowStep["action"],
      remarks: string,
      debitAmount?: number,
      reasonForDebit?: string,
    ) => {
      setBills((prev) => {
        const next = prev.map((b) => {
          if (b.id !== id) return b;
          const historyEntry: WorkflowStep = {
            step,
            action,
            remarks,
            debitAmount,
            reasonForDebit,
            timestamp: new Date().toISOString(),
          };
          let newWorkflowStatus = b.workflowStatus;
          let newDebitAmount = b.debitAmount;
          let newReasonForDebit = b.reasonForDebit;

          if (action === "Approved") {
            if (step === "PM") newWorkflowStatus = "PM Approved";
            else if (step === "QC") newWorkflowStatus = "QC Approved";
            else if (step === "Billing Engineer")
              newWorkflowStatus = "Billing Approved";
          } else if (action === "Rejected") {
            newWorkflowStatus = "Rejected";
          } else if (action === "Added Debit") {
            newDebitAmount = (b.debitAmount || 0) + (debitAmount || 0);
            newReasonForDebit = reasonForDebit || b.reasonForDebit;
          }

          const effectiveDebit = newReasonForDebit?.trim() ? newDebitAmount : 0;
          const retentionAmount =
            ((b.grossAmount - effectiveDebit) / 100) * b.workRetention;
          const netAmount = b.grossAmount - effectiveDebit + retentionAmount;

          return {
            ...b,
            workflowStatus: newWorkflowStatus,
            status: (newWorkflowStatus === "Billing Approved"
              ? "Approved"
              : newWorkflowStatus === "Rejected"
                ? "Rejected"
                : "Pending") as PayGoBill["status"],
            debitAmount: newDebitAmount,
            reasonForDebit: newReasonForDebit,
            retentionAmount,
            netAmount,
            amount: netAmount,
            remainingAmount:
              newWorkflowStatus === "Billing Approved"
                ? netAmount - b.paidAmount
                : b.remainingAmount,
            workflowHistory: [...b.workflowHistory, historyEntry],
          };
        });
        saveToStorage("bills", next);
        return next;
      });
    },
    [],
  );

  const payBill = useCallback((id: string, payAmount: number) => {
    setBills((prev) => {
      const next = prev.map((b) => {
        if (b.id !== id) return b;
        const newPaid = b.paidAmount + payAmount;
        const remaining = b.netAmount - newPaid;
        const paymentStatus: PayGoBill["paymentStatus"] =
          remaining <= 0 ? "Completed" : "Partially Paid";
        return {
          ...b,
          paidAmount: newPaid,
          remainingAmount: Math.max(0, remaining),
          paymentStatus,
          status: paymentStatus === "Completed" ? "Paid" : b.status,
        };
      });
      saveToStorage("bills", next);
      return next;
    });
  }, []);

  const addNMRBill = useCallback((b: Omit<PayGoNMRBill, "id" | "billNo">) => {
    setNMRBills((prev) => {
      const nextNo = `NMR-${String(prev.length + 1).padStart(3, "0")}`;
      const next = [...prev, { ...b, id: genId(), billNo: nextNo }];
      saveToStorage("nmrBills", next);
      return next;
    });
  }, []);

  const updateNMRBill = useCallback((b: PayGoNMRBill) => {
    setNMRBills((prev) => {
      const next = prev.map((x) => (x.id === b.id ? b : x));
      saveToStorage("nmrBills", next);
      return next;
    });
  }, []);

  const deleteNMRBill = useCallback((id: string) => {
    setNMRBills((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("nmrBills", next);
      return next;
    });
  }, []);

  return (
    <PayGoContext.Provider
      value={{
        projects,
        contractors,
        payments,
        bills,
        nmrBills,
        addProject,
        updateProject,
        deleteProject,
        addContractor,
        updateContractor,
        deleteContractor,
        addPayment,
        updatePayment,
        deletePayment,
        addBill,
        updateBill,
        deleteBill,
        updateBillWorkflow,
        payBill,
        addNMRBill,
        updateNMRBill,
        deleteNMRBill,
      }}
    >
      {children}
    </PayGoContext.Provider>
  );
}

export function usePayGo(): PayGoContextValue {
  const ctx = useContext(PayGoContext);
  if (!ctx) throw new Error("usePayGo must be used inside PayGoProvider");
  return ctx;
}
