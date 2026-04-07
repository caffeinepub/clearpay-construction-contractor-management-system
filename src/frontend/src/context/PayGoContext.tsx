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
  subTrade: string;
  project: string;
  contractingPrice: number;
  unit: string;
  contact: string;
  email: string;
  address: string;
  attachmentLink1: string;
  attachmentLink2: string;
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
  subTrade: string;
  blockId: string;
  date: string;
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
  workflowStatus:
    | "Pending PM Review"
    | "PM Approved"
    | "QC Approved"
    | "Billing Approved"
    | "Rejected";
  workflowHistory: WorkflowStep[];
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "Unpaid" | "Partially Paid" | "Completed";
  paymentEntries: PaymentEntry[];
  amount: number;
  status: "Pending" | "Approved" | "Paid" | "Rejected";
  year: string;
  financialYear: string;
};

// NMR Labour row
export type NMRLabourRow = {
  id: string;
  description: string;
  date: string;
  masonCount: number;
  masonRate: number;
  maleHelperCount: number;
  maleHelperRate: number;
  femaleHelperCount: number;
  femaleHelperRate: number;
  amount: number;
};

export type PayGoNMRBill = {
  id: string;
  billNo: string;
  project: string;
  contractor: string;
  trade: string;
  subTrade: string;
  blockId: string;
  weekFrom: string;
  weekTo: string;
  description: string;
  rows: NMRLabourRow[];
  totalAmount: number;
  status: "Pending" | "Approved" | "Paid";
  workflowStatus:
    | "Pending PM Review"
    | "PM Approved"
    | "QC Approved"
    | "Billing Approved"
    | "Rejected";
  workflowHistory: WorkflowStep[];
  remarks: string;
  year: string;
  financialYear: string;
  // Simple flat fields for quick NMR entry (alternative to rows)
  labourCount?: number;
  totalDays?: number;
  ratePerDay?: number;
};

// ─── BOQ Types ─────────────────────────────────────────────────────────────────

export type BOQItem = {
  id: string;
  description: string;
  unit: string;
  nos: number;
  length: number;
  width: number;
  height: number;
  qty: number;
  isManualQty: boolean;
  rate: number;
  amount: number;
};

export type PaymentEntry = {
  id: string;
  date: string;
  amount: number;
  paymentMode?: string;
  reference?: string;
};

export type BOQSubCategory = {
  id: string;
  name: string;
  items: BOQItem[];
};

export type BOQCategory = {
  id: string;
  name: string;
  subCategories: BOQSubCategory[];
  isExpanded: boolean;
};

export type PayGoBOQ = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  createdDate: string;
  categories: BOQCategory[];
};

// ─── Work Order Types ──────────────────────────────────────────────────────────

export type WorkOrderItem = {
  boqItemId: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
};

export type PayGoWorkOrder = {
  id: string;
  workOrderNo: string;
  project: string;
  contractor: string;
  boqId: string;
  scopeOfWork: string;
  workOrderDate: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  retentionPct: number;
  specialConditions: string;
  items: WorkOrderItem[];
  totalAmount: number;
  status: "Draft" | "Issued" | "In Progress" | "Completed";
  version: number;
  notes: string;
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
  boqs: PayGoBOQ[];
  workOrders: PayGoWorkOrder[];
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
    retentionPct?: number,
  ) => void;
  payBill: (
    id: string,
    payAmount: number,
    paymentMode?: string,
    reference?: string,
  ) => void;
  addNMRBill: (b: Omit<PayGoNMRBill, "id" | "billNo">) => void;
  updateNMRBill: (b: PayGoNMRBill) => void;
  deleteNMRBill: (id: string) => void;
  addBOQ: (b: Omit<PayGoBOQ, "id">) => void;
  updateBOQ: (b: PayGoBOQ) => void;
  deleteBOQ: (id: string) => void;
  addWorkOrder: (
    w: Omit<PayGoWorkOrder, "id" | "workOrderNo" | "version">,
  ) => void;
  updateWorkOrder: (w: PayGoWorkOrder) => void;
  deleteWorkOrder: (id: string) => void;
  duplicateWorkOrder: (id: string) => void;
};

const PayGoContext = createContext<PayGoContextValue | null>(null);

const SEED_BILLS: PayGoBill[] = [
  {
    id: "b1",
    billNo: "SU001",
    project: "Sunrise Towers",
    contractor: "Ramesh & Sons",
    trade: "Mason",
    subTrade: "",
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
    paymentEntries: [],
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
    subTrade: "",
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
    paymentEntries: [{ id: "pe-b2-1", date: "2025-02-15", amount: 80750 }],
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
    subTrade: "",
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
    paymentEntries: [],
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
    subTrade: "",
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
    paymentEntries: [],
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
    subTrade: "",
    blockId: "BLK-A1",
    weekFrom: "2025-01-06",
    weekTo: "2025-01-12",
    description: "Week 2 masonry labour",
    rows: [
      {
        id: "r1",
        description: "Foundation masonry",
        date: "2025-01-06",
        masonCount: 5,
        masonRate: 500,
        maleHelperCount: 3,
        maleHelperRate: 400,
        femaleHelperCount: 2,
        femaleHelperRate: 350,
        amount: 5500,
      },
    ],
    totalAmount: 5500,
    status: "Approved",
    workflowStatus: "Billing Approved",
    workflowHistory: [],
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
    subTrade: "",
    blockId: "BLK-R1",
    weekFrom: "2025-02-03",
    weekTo: "2025-02-09",
    description: "Road crew week 1",
    rows: [
      {
        id: "r3",
        description: "Scaffolding erection",
        date: "2025-02-03",
        masonCount: 0,
        masonRate: 500,
        maleHelperCount: 4,
        maleHelperRate: 400,
        femaleHelperCount: 2,
        femaleHelperRate: 350,
        amount: 2300,
      },
    ],
    totalAmount: 2300,
    status: "Pending",
    workflowStatus: "Pending PM Review",
    workflowHistory: [],
    remarks: "Road crew week 1",
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
    subTrade: "",
    project: "Sunrise Towers",
    contractingPrice: 1000,
    unit: "Sft",
    contact: "9876543210",
    email: "ramesh@example.com",
    address: "Chennai, TN",
    attachmentLink1: "",
    attachmentLink2: "",
    notes: "",
    status: "Active",
  },
  {
    id: "c2",
    name: "Kumar Scaffolding",
    trade: "Scaffolding",
    subTrade: "",
    project: "Green Valley Roads",
    contractingPrice: 850,
    unit: "Rft",
    contact: "9876500001",
    email: "kumar@example.com",
    address: "Hyderabad, TS",
    attachmentLink1: "",
    attachmentLink2: "",
    notes: "",
    status: "Active",
  },
  {
    id: "c3",
    name: "Kumar Scaffolding",
    trade: "M S",
    subTrade: "",
    project: "Industrial Shed A",
    contractingPrice: 620,
    unit: "Sft",
    contact: "9876500001",
    email: "kumar@example.com",
    address: "Hyderabad, TS",
    attachmentLink1: "",
    attachmentLink2: "",
    notes: "",
    status: "Active",
  },
  {
    id: "c4",
    name: "Ramesh & Sons",
    trade: "Bar bending",
    subTrade: "",
    project: "Sunrise Towers",
    contractingPrice: 1200,
    unit: "Kg",
    contact: "9876543210",
    email: "ramesh@example.com",
    address: "Chennai, TN",
    attachmentLink1: "",
    attachmentLink2: "",
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

// ─── BOQ Seed Data ─────────────────────────────────────────────────────────────
const g = genId;
const SEED_BOQS: PayGoBOQ[] = [
  {
    id: "boq1",
    projectId: "proj1",
    projectName: "Sunrise Towers",
    title: "Sunrise Towers — Full BOQ",
    createdDate: "2025-01-01",
    categories: [
      {
        id: "cat-ew",
        name: "Earthwork",
        isExpanded: true,
        subCategories: [
          {
            id: "sc-ew1",
            name: "Excavation",
            items: [
              {
                id: "i-ew1a",
                description: "Earth excavation for foundation",
                unit: "Cumtr",
                nos: 1,
                length: 20,
                width: 15,
                height: 2.5,
                qty: 750,
                isManualQty: false,
                rate: 120,
                amount: 90000,
              },
              {
                id: "i-ew1b",
                description: "Rock excavation",
                unit: "Cumtr",
                nos: 1,
                length: 10,
                width: 8,
                height: 1.5,
                qty: 120,
                isManualQty: false,
                rate: 350,
                amount: 42000,
              },
            ],
          },
          {
            id: "sc-ew2",
            name: "Backfilling & Compaction",
            items: [
              {
                id: "i-ew2a",
                description: "Filling with selected earth",
                unit: "Cumtr",
                nos: 1,
                length: 20,
                width: 15,
                height: 1,
                qty: 300,
                isManualQty: false,
                rate: 80,
                amount: 24000,
              },
              {
                id: "i-ew2b",
                description: "Compaction by vibro-roller",
                unit: "Sft",
                nos: 1,
                length: 20,
                width: 15,
                height: 1,
                qty: 300,
                isManualQty: false,
                rate: 45,
                amount: 13500,
              },
              {
                id: "i-ew2c",
                description: "Disposal of surplus earth",
                unit: "Cumtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 50,
                isManualQty: true,
                rate: 200,
                amount: 10000,
              },
            ],
          },
        ],
      },
      {
        id: "cat-rcc",
        name: "RCC",
        isExpanded: false,
        subCategories: [
          {
            id: "sc-rcc1",
            name: "Footings",
            items: [
              {
                id: "i-rcc1a",
                description: "M25 concrete for footings",
                unit: "Cumtr",
                nos: 1,
                length: 3,
                width: 3,
                height: 0.5,
                qty: 54,
                isManualQty: false,
                rate: 5500,
                amount: 297000,
              },
              {
                id: "i-rcc1b",
                description: "Steel reinforcement in footings",
                unit: "Kg",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 2800,
                isManualQty: true,
                rate: 85,
                amount: 238000,
              },
            ],
          },
          {
            id: "sc-rcc2",
            name: "Columns & Beams",
            items: [
              {
                id: "i-rcc2a",
                description: "M25 concrete for columns",
                unit: "Cumtr",
                nos: 1,
                length: 0.3,
                width: 0.3,
                height: 3,
                qty: 27,
                isManualQty: false,
                rate: 5800,
                amount: 156600,
              },
              {
                id: "i-rcc2b",
                description: "M25 concrete for beams",
                unit: "Cumtr",
                nos: 1,
                length: 6,
                width: 0.23,
                height: 0.45,
                qty: 3.11,
                isManualQty: false,
                rate: 5800,
                amount: 18040,
              },
            ],
          },
        ],
      },
      {
        id: "cat-mas",
        name: "Masonry",
        isExpanded: false,
        subCategories: [
          {
            id: "sc-mas1",
            name: "Brick Walls",
            items: [
              {
                id: "i-mas1a",
                description: "230mm thick brick wall in CM 1:4",
                unit: "Sft",
                nos: 1,
                length: 50,
                width: 1,
                height: 3,
                qty: 150,
                isManualQty: false,
                rate: 95,
                amount: 14250,
              },
              {
                id: "i-mas1b",
                description: "115mm thick partition wall",
                unit: "Sft",
                nos: 1,
                length: 30,
                width: 1,
                height: 3,
                qty: 90,
                isManualQty: false,
                rate: 65,
                amount: 5850,
              },
            ],
          },
          {
            id: "sc-mas2",
            name: "Plastering",
            items: [
              {
                id: "i-mas2a",
                description: "Internal plastering 12mm thick",
                unit: "Sft",
                nos: 1,
                length: 80,
                width: 1,
                height: 3,
                qty: 240,
                isManualQty: false,
                rate: 45,
                amount: 10800,
              },
              {
                id: "i-mas2b",
                description: "External plastering 20mm thick",
                unit: "Sft",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 180,
                isManualQty: true,
                rate: 60,
                amount: 10800,
              },
            ],
          },
        ],
      },
      {
        id: "cat-fin",
        name: "Finishing",
        isExpanded: false,
        subCategories: [
          {
            id: "sc-fin1",
            name: "Flooring",
            items: [
              {
                id: "i-fin1a",
                description: "Ceramic tile flooring 600x600mm",
                unit: "Sft",
                nos: 1,
                length: 20,
                width: 15,
                height: 1,
                qty: 300,
                isManualQty: false,
                rate: 120,
                amount: 36000,
              },
              {
                id: "i-fin1b",
                description: "Granite flooring in lobby",
                unit: "Sft",
                nos: 1,
                length: 8,
                width: 5,
                height: 1,
                qty: 40,
                isManualQty: false,
                rate: 280,
                amount: 11200,
              },
            ],
          },
          {
            id: "sc-fin2",
            name: "Painting",
            items: [
              {
                id: "i-fin2a",
                description: "Emulsion paint 2 coats internal",
                unit: "Sft",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 4200,
                isManualQty: true,
                rate: 18,
                amount: 75600,
              },
              {
                id: "i-fin2b",
                description: "Weather coat paint external",
                unit: "Sft",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 2800,
                isManualQty: true,
                rate: 25,
                amount: 70000,
              },
            ],
          },
        ],
      },
      {
        id: "cat-elec",
        name: "Electrical",
        isExpanded: false,
        subCategories: [
          {
            id: "sc-elec1",
            name: "Wiring & Conduits",
            items: [
              {
                id: "i-elec1a",
                description: "1.5 sqmm FR wire in conduit",
                unit: "Rmtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 2000,
                isManualQty: true,
                rate: 55,
                amount: 110000,
              },
              {
                id: "i-elec1b",
                description: "4 sqmm FR wire in conduit",
                unit: "Rmtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 800,
                isManualQty: true,
                rate: 85,
                amount: 68000,
              },
            ],
          },
          {
            id: "sc-elec2",
            name: "Fixtures & Fittings",
            items: [
              {
                id: "i-elec2a",
                description: "Modular switches and sockets",
                unit: "Nos",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 120,
                isManualQty: true,
                rate: 350,
                amount: 42000,
              },
              {
                id: "i-elec2b",
                description: "LED light fixtures",
                unit: "Nos",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 80,
                isManualQty: true,
                rate: 850,
                amount: 68000,
              },
            ],
          },
        ],
      },
      {
        id: "cat-plumb",
        name: "Plumbing",
        isExpanded: false,
        subCategories: [
          {
            id: "sc-plumb1",
            name: "Water Supply",
            items: [
              {
                id: "i-plumb1a",
                description: "CPVC pipe 25mm dia",
                unit: "Rmtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 400,
                isManualQty: true,
                rate: 95,
                amount: 38000,
              },
              {
                id: "i-plumb1b",
                description: "GI pipe 50mm dia main line",
                unit: "Rmtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 120,
                isManualQty: true,
                rate: 220,
                amount: 26400,
              },
            ],
          },
          {
            id: "sc-plumb2",
            name: "Sanitary & Drainage",
            items: [
              {
                id: "i-plumb2a",
                description: "PVC drainage pipe 110mm",
                unit: "Rmtr",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 350,
                isManualQty: true,
                rate: 180,
                amount: 63000,
              },
              {
                id: "i-plumb2b",
                description: "Sanitary fixtures per unit",
                unit: "Nos",
                nos: 1,
                length: 0,
                width: 0,
                height: 0,
                qty: 24,
                isManualQty: true,
                rate: 8500,
                amount: 204000,
              },
            ],
          },
        ],
      },
    ],
  },
];

const SEED_WORK_ORDERS: PayGoWorkOrder[] = [
  {
    id: "wo1",
    workOrderNo: "SU-WO-001",
    project: "Sunrise Towers",
    contractor: "Ramesh & Sons",
    boqId: "boq1",
    scopeOfWork:
      "Masonry work including brick walls, plastering, and finishing for Block A floors 1-5.",
    workOrderDate: "2025-01-05",
    startDate: "2025-01-10",
    endDate: "2025-06-30",
    paymentTerms:
      "Monthly billing based on actual work done. Payment within 30 days of approved bill.",
    retentionPct: 5,
    specialConditions:
      "All materials to be approved by Site Engineer before use. Safety norms to be strictly followed.",
    items: [
      {
        boqItemId: "i-mas1a",
        description: "230mm thick brick wall in CM 1:4",
        unit: "Sft",
        qty: 150,
        rate: 95,
        amount: 14250,
      },
      {
        boqItemId: "i-mas2a",
        description: "Internal plastering 12mm thick",
        unit: "Sft",
        qty: 240,
        rate: 45,
        amount: 10800,
      },
    ],
    totalAmount: 23812,
    status: "Issued",
    version: 1,
    notes: "Initial work order for masonry scope.",
  },
];

// Reset genId usage after seed data constants (avoid side effects)
void g;

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

  const [boqs, setBOQs] = useState<PayGoBOQ[]>(() =>
    loadFromStorage("boqs", SEED_BOQS),
  );

  const [workOrders, setWorkOrders] = useState<PayGoWorkOrder[]>(() =>
    loadFromStorage("workorders", SEED_WORK_ORDERS),
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
      retentionPct?: number,
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
          // Never overwrite engineer's original debit — accumulate only workflow debits in history
          let newWorkRetention = b.workRetention;

          if (action === "Approved") {
            if (step === "PM") newWorkflowStatus = "PM Approved";
            else if (step === "QC") newWorkflowStatus = "QC Approved";
            else if (step === "Billing Engineer") {
              newWorkflowStatus = "Billing Approved";
              // BE sets retention %
              if (retentionPct !== undefined) newWorkRetention = retentionPct;
            }
          } else if (action === "Rejected") {
            newWorkflowStatus = "Rejected";
          }
          // "Added Debit" — debitAmount is stored in history entry only, not overwriting b.debitAmount

          // Compute total effective debit:
          // Engineer's original debit (if reason valid)
          const engineerDebitVal =
            b.reasonForDebit && b.reasonForDebit.length > 20
              ? b.debitAmount
              : 0;
          // All workflow debits from history (including new entry if it's a debit)
          const allHistory = [...b.workflowHistory, historyEntry];
          const historyDebits = allHistory
            .filter((h) => h.action === "Added Debit")
            .reduce((s, h) => s + (h.debitAmount || 0), 0);
          const totalEffectiveDebit = engineerDebitVal + historyDebits;

          // Retention only applied once BE approves
          const applyRetention = newWorkflowStatus === "Billing Approved";
          const retentionAmount = applyRetention
            ? ((b.grossAmount - totalEffectiveDebit) / 100) * newWorkRetention
            : 0;
          const netAmount =
            b.grossAmount - totalEffectiveDebit - retentionAmount;

          return {
            ...b,
            workflowStatus: newWorkflowStatus,
            status: (newWorkflowStatus === "Billing Approved"
              ? "Approved"
              : newWorkflowStatus === "Rejected"
                ? "Rejected"
                : "Pending") as PayGoBill["status"],
            // Do NOT update debitAmount — it stays as engineer's original debit
            workRetention: newWorkRetention,
            retentionAmount,
            netAmount,
            amount: netAmount,
            remainingAmount: netAmount - (b.paidAmount || 0),
            workflowHistory: allHistory,
          };
        });
        saveToStorage("bills", next);
        return next;
      });
    },
    [],
  );

  const payBill = useCallback(
    (
      id: string,
      payAmount: number,
      paymentMode?: string,
      reference?: string,
    ) => {
      setBills((prev) => {
        const next = prev.map((b) => {
          if (b.id !== id) return b;
          const newPaid = (b.paidAmount || 0) + payAmount;
          const remaining = (b.remainingAmount || 0) - payAmount;
          let paymentStatus: PayGoBill["paymentStatus"] = "Partially Paid";
          if (remaining <= 0) paymentStatus = "Completed";
          const newEntry: PaymentEntry = {
            id: `pe-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            amount: payAmount,
            paymentMode,
            reference,
          };
          return {
            ...b,
            paidAmount: newPaid,
            remainingAmount: Math.max(0, remaining),
            paymentStatus,
            paymentEntries: [...(b.paymentEntries || []), newEntry],
            status: paymentStatus === "Completed" ? "Paid" : b.status,
          };
        });
        saveToStorage("bills", next);
        return next;
      });
    },
    [],
  );

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

  // ─── BOQ CRUD ────────────────────────────────────────────────────────────────
  const addBOQ = useCallback((b: Omit<PayGoBOQ, "id">) => {
    setBOQs((prev) => {
      const next = [...prev, { ...b, id: genId() }];
      saveToStorage("boqs", next);
      return next;
    });
  }, []);

  const updateBOQ = useCallback((b: PayGoBOQ) => {
    setBOQs((prev) => {
      const next = prev.map((x) => (x.id === b.id ? b : x));
      saveToStorage("boqs", next);
      return next;
    });
  }, []);

  const deleteBOQ = useCallback((id: string) => {
    setBOQs((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("boqs", next);
      return next;
    });
  }, []);

  // ─── Work Order CRUD ─────────────────────────────────────────────────────────
  const addWorkOrder = useCallback(
    (w: Omit<PayGoWorkOrder, "id" | "workOrderNo" | "version">) => {
      setWorkOrders((prev) => {
        const prefix = w.project.slice(0, 2).toUpperCase();
        const seq = prev.length + 1;
        const workOrderNo = `${prefix}-WO-${String(seq).padStart(3, "0")}`;
        const next = [...prev, { ...w, id: genId(), workOrderNo, version: 1 }];
        saveToStorage("workorders", next);
        return next;
      });
    },
    [],
  );

  const updateWorkOrder = useCallback((w: PayGoWorkOrder) => {
    setWorkOrders((prev) => {
      const next = prev.map((x) => (x.id === w.id ? w : x));
      saveToStorage("workorders", next);
      return next;
    });
  }, []);

  const deleteWorkOrder = useCallback((id: string) => {
    setWorkOrders((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveToStorage("workorders", next);
      return next;
    });
  }, []);

  const duplicateWorkOrder = useCallback((id: string) => {
    setWorkOrders((prev) => {
      const original = prev.find((x) => x.id === id);
      if (!original) return prev;
      const prefix = original.project.slice(0, 2).toUpperCase();
      const seq = prev.length + 1;
      const workOrderNo = `${prefix}-WO-${String(seq).padStart(3, "0")}`;
      const duplicate: PayGoWorkOrder = {
        ...original,
        id: genId(),
        workOrderNo,
        version: original.version + 1,
        status: "Draft",
      };
      const next = [...prev, duplicate];
      saveToStorage("workorders", next);
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
        boqs,
        workOrders,
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
        addBOQ,
        updateBOQ,
        deleteBOQ,
        addWorkOrder,
        updateWorkOrder,
        deleteWorkOrder,
        duplicateWorkOrder,
      }}
    >
      {children}
    </PayGoContext.Provider>
  );
}

export function usePayGo(): PayGoContextValue {
  const ctx = useContext(PayGoContext);
  if (!ctx) throw new Error("usePayGo must be used within PayGoProvider");
  return ctx;
}
