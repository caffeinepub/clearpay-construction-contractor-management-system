import type { Principal } from "@icp-sdk/core/principal";

// ─── Core Option types ─────────────────────────────────────────────────────

export interface Some<T> {
  __kind__: "Some";
  value: T;
}
export interface None {
  __kind__: "None";
}
export type Option<T> = Some<T> | None;

// ─── Enum-like string unions ───────────────────────────────────────────────

export type UserRole =
  | "admin"
  | "user"
  | "guest"
  | "pm"
  | "qc"
  | "billing_engineer"
  | "site_engineer";

export const UserRole = {
  admin: "admin" as UserRole,
  user: "user" as UserRole,
  guest: "guest" as UserRole,
  pm: "pm" as UserRole,
  qc: "qc" as UserRole,
  billing_engineer: "billing_engineer" as UserRole,
  site_engineer: "site_engineer" as UserRole,
};

export type PaymentMode =
  | "cash"
  | "account"
  | "bank_transfer"
  | "cheque"
  | "upi"
  | "neft"
  | "rtgs"
  | "other";

export const PaymentMode = {
  cash: "cash" as PaymentMode,
  account: "account" as PaymentMode,
  bank_transfer: "bank_transfer" as PaymentMode,
  cheque: "cheque" as PaymentMode,
  upi: "upi" as PaymentMode,
  neft: "neft" as PaymentMode,
  rtgs: "rtgs" as PaymentMode,
  other: "other" as PaymentMode,
};

// ─── Data model interfaces ─────────────────────────────────────────────────

export interface UserProfile {
  id?: string;
  /** Display name for the user (primary name field) */
  fullName: string;
  email: string;
  /** Primary contact number */
  contact: string;
  role: UserRole;
  active: boolean;
  principalId?: string;
  accessProjects: string[];
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  budget?: number;
  /** Unit price per item */
  unitPrice: number;
  unit?: string;
  /** Number of units / quantity */
  quantity: number;
  estimatedQuantity?: number;
  estimatedAmount: number;
  location: string;
  contactNumber: string;
  address: string;
  /** Array of attachment URLs [link1, link2] */
  attachmentLinks: string[];
  notes: string;
  status?: string;
  completed?: boolean;
  createdAt?: string;
}

export interface Bill {
  id?: string;
  projectId: string;
  projectName?: string;
  billNumber: string;
  blockId?: string;
  date: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  /** Whether GST (18%) is included in the amount */
  includesGst?: boolean;
  gstPercent?: number;
  gstAmount?: number;
  totalAmount?: number;
  workRetentionPercent?: number;
  workRetentionAmount?: number;
  grossAmount?: number;
  netAmount?: number;
  remarks?: string;
  createdAt?: string;
}

export interface BillKey {
  projectId: string;
  billNumber: string;
}

export interface Payment {
  id: string;
  projectId: string;
  projectName?: string;
  paymentNumber?: string;
  date: string;
  amount: number;
  paymentMode: PaymentMode;
  reference: string;
  remarks?: string;
  billId?: string;
  billNumber?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  /** Primary contact number */
  contact: string;
  address: string;
  gstNumber?: string;
  notes: string;
  createdAt?: string;
}

export interface DashboardMetrics {
  totalBills: number;
  totalPayments: number;
  outstanding: number;
  totalGst: number;
}

export interface ProjectAnalyticsData {
  projectId: string;
  projectName: string;
  totalBills: number;
  totalPayments: number;
  outstanding: number;
  gstOutstanding: number;
}

export interface ImportRequest {
  type: string;
  data: string;
}

// ─── Backend interface (typed actor methods) ───────────────────────────────

export interface backendInterface {
  // Projects
  getAllProjects(): Promise<Project[]>;
  addProject(project: Project): Promise<void>;
  updateProject(project: Project, password: string): Promise<boolean>;
  deleteProject(id: string, password: string): Promise<boolean>;
  getAllProjectNames(): Promise<string[]>;
  getCompletedProjectIds(): Promise<string[]>;
  toggleProjectCompleted(id: string): Promise<void>;
  getProjectMapLocations(): Promise<[string, string][]>;
  setProjectMapLocation(projectId: string, location: string): Promise<void>;

  // Bills
  getAllBills(): Promise<Bill[]>;
  addBill(bill: Bill): Promise<void>;
  updateBill(bill: Bill, password: string): Promise<boolean>;
  deleteBill(
    projectId: string,
    billNumber: string,
    password: string,
  ): Promise<boolean>;
  bulkDeleteBillsWithPassword(
    password: string,
    billKeys: BillKey[],
  ): Promise<boolean>;

  // Payments
  getAllPayments(): Promise<Payment[]>;
  addPayment(payment: Payment): Promise<void>;
  updatePayment(payment: Payment, password: string): Promise<boolean>;
  deletePayment(id: string, password: string): Promise<boolean>;
  bulkDeletePayments(password: string, ids: string[]): Promise<boolean>;

  // Clients
  getAllClients(): Promise<Client[]>;
  addClient(client: Client): Promise<void>;
  updateClient(client: Client, password: string): Promise<boolean>;
  deleteClient(id: string, password: string): Promise<boolean>;

  // Dashboard / Analytics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getProjectWiseAnalyticsData(sortBy: string): Promise<ProjectAnalyticsData[]>;
  getProjectSummary(projectId: string): Promise<unknown>;

  // Users
  listUsers(): Promise<[Principal, UserProfile][]>;
  addUser(profile: UserProfile): Promise<void>;
  updateUser(userPrincipal: Principal, profile: UserProfile): Promise<boolean>;
  deleteUsers(password: string, principalIds: string[]): Promise<boolean>;
  getCallerUserProfile(): Promise<UserProfile | null>;
  getCallerUserRole(): Promise<UserRole>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  getUserAccess(email: string): Promise<string[]>;
  linkMasterAdminPrincipal(): Promise<boolean>;
  linkUserByEmail(email: string): Promise<boolean>;

  // Admin password management
  changeAdminPassword(
    email: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
    hintQuestion: string,
    hintAnswer: string,
  ): Promise<void>;
  setHintQuestionAndAnswer(question: string, answer: string): Promise<void>;
  getAdminPasswordQuestion(): Promise<string>;
  revealAdminPassword(answer: string): Promise<string>;

  // AI
  getGreetingMessage(arg: null): Promise<string>;

  // Import
  importData(request: ImportRequest, password: string): Promise<boolean>;

  // SFT
  listContractors(): Promise<unknown[]>;
  listSftEntries(): Promise<unknown[]>;
  addSftEntry(
    contractorId: string,
    projectId: string,
    billNo: string,
    slabNo: string,
    footings: number,
    rw: number,
    columns: number,
    beams: number,
    slab: number,
    oht: number,
    remarks: string,
  ): Promise<void>;
  updateSftEntry(
    id: string,
    contractorId: string,
    projectId: string,
    billNo: string,
    slabNo: string,
    footings: number,
    rw: number,
    columns: number,
    beams: number,
    slab: number,
    oht: number,
    remarks: string,
    password: string,
  ): Promise<boolean>;
  deleteSftEntries(ids: string[], password: string): Promise<boolean>;

  // Ticker
  getTickerMessages(): Promise<[string, string][]>;
  saveTickerMessages(msgs: [string, string][]): Promise<void>;
}
