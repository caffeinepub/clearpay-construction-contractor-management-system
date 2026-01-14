import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserFilters {
    contact?: string;
    name?: string;
    role?: UserRole;
    email?: string;
}
export interface BillKey {
    projectId: string;
    billNumber: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface PaymentFilters {
    maxAmount?: number;
    minAmount?: number;
    reference?: string;
    search?: string;
    toDate?: string;
    projectId?: string;
    fromDate?: string;
    paymentMode?: PaymentMode;
}
export interface Payment {
    id: string;
    date: string;
    reference: string;
    projectId: string;
    paymentMode: PaymentMode;
    amount: number;
    remarks?: string;
}
export interface BillFilters {
    maxAmount?: number;
    client?: string;
    minAmount?: number;
    blockId?: string;
    search?: string;
    toDate?: string;
    projectId?: string;
    fromDate?: string;
    includesGst?: boolean;
    billNumber?: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ProjectFilters {
    client?: string;
    maxUnitPrice?: number;
    search?: string;
    toDate?: string;
    fromDate?: string;
    minUnitPrice?: number;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Bill {
    date: string;
    blockId?: string;
    unit: string;
    description: string;
    projectId: string;
    includesGst: boolean;
    billNumber: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    remarks?: string;
}
export interface DashboardMetrics {
    outstanding: number;
    totalPayments: number;
    totalGst: number;
    totalBills: number;
}
export interface ProjectAnalyticsData {
    id: string;
    name: string;
    outstandingAmount: number;
}
export interface Project {
    id: string;
    client: string;
    endDate: string;
    name: string;
    address: string;
    notes: string;
    quantity: number;
    contactNumber: string;
    unitPrice: number;
    attachmentLinks: Array<string>;
    location: string;
    estimatedAmount: number;
    startDate: string;
}
export interface Client {
    id: string;
    contact: string;
    name: string;
    email: string;
    address: string;
    notes: string;
}
export interface UserProfile {
    active: boolean;
    contact: string;
    role: UserRole;
    fullName: string;
    email: string;
}
export enum PaymentMode {
    cash = "cash",
    account = "account"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBill(bill: Bill): Promise<void>;
    addClient(client: Client): Promise<void>;
    addPayment(payment: Payment): Promise<void>;
    addProject(project: Project): Promise<void>;
    addUser(user: Principal, profile: UserProfile): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkDeleteBillsWithPassword(password: string, billKeys: Array<BillKey>): Promise<void>;
    bulkDeleteClients(password: string): Promise<void>;
    bulkDeletePayments(password: string, ids: Array<string>): Promise<void>;
    bulkDeleteProjects(password: string): Promise<void>;
    deleteBill(projectId: string, billNumber: string): Promise<void>;
    deleteClient(id: string): Promise<void>;
    deletePayment(id: string): Promise<void>;
    deleteProject(id: string): Promise<void>;
    deleteUser(user: Principal, password: string): Promise<void>;
    filterBills(billFilters: BillFilters): Promise<Array<Bill>>;
    filterBillsByProject(projectId: string): Promise<Array<Bill>>;
    filterPayments(filters: PaymentFilters): Promise<Array<Payment>>;
    filterProjects(filters: ProjectFilters): Promise<Array<Project>>;
    filterUsers(filters: UserFilters): Promise<Array<[Principal, UserProfile]>>;
    getAllBills(): Promise<Array<Bill>>;
    getAllClients(): Promise<Array<Client>>;
    getAllPayments(): Promise<Array<Payment>>;
    getAllProjectNames(): Promise<Array<string>>;
    getAllProjects(): Promise<Array<Project>>;
    getAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardMetrics(): Promise<DashboardMetrics>;
    getGreetingMessage(arg0: null): Promise<string>;
    getOutstandingAmount(): Promise<number>;
    getProjectSummary(projectId: string): Promise<{
        outstanding: number;
        accountPayments: number;
        cashPayments: number;
        totalPayments: number;
        gstOutstanding: number;
        totalBills: number;
        project: Project;
    } | null>;
    getProjectWiseAnalyticsData(sortBy: string): Promise<Array<ProjectAnalyticsData>>;
    getSortedBills(sortBy: string | null, ascending: boolean): Promise<Array<Bill>>;
    getTotalGst(): Promise<number>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasActiveProfile(email: string): Promise<boolean>;
    hasProfileSetup(): Promise<boolean>;
    importActiveUsers(userProfilesData: Array<[Principal, UserProfile]>): Promise<void>;
    importBills(billsData: Array<Bill>): Promise<void>;
    importClients(clientsData: Array<Client>): Promise<void>;
    importPayments(paymentsData: Array<Payment>): Promise<void>;
    importProjects(projectsData: Array<Project>): Promise<void>;
    importUsers(usersData: Array<[Principal, UserProfile]>): Promise<void>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    toggleUserActiveStatus(user: Principal, active: boolean): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateBill(bill: Bill): Promise<void>;
    updateClient(client: Client): Promise<void>;
    updatePayment(payment: Payment): Promise<void>;
    updateProject(project: Project): Promise<void>;
    updateUser(user: Principal, profile: UserProfile): Promise<void>;
    validateActiveUser(email: string): Promise<void>;
}
