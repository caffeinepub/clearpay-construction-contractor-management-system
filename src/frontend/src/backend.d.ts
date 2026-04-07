import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BillKey {
    projectId: string;
    billNumber: string;
}
export interface ImportRequest {
    projectsData: Array<Project>;
    billsData: Array<Bill>;
    usersData: Array<[Principal, UserProfile]>;
    paymentsData: Array<Payment>;
    clientsData: Array<Client>;
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
export interface Client {
    id: string;
    contact: string;
    name: string;
    email: string;
    address: string;
    notes: string;
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
export interface UserProfile {
    active: boolean;
    contact: string;
    accessProjects: Array<string>;
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
    addContractor(name: string, trades: Array<string>, projectId: string, date: string, contractingPrice: number, unit: string, contact1: string, contact2: string, email: string, address: string, link1: string, link2: string, note: string, woNo: string): Promise<string>;
    addContractorBill(contractorId: string, projectId: string, billNo: string, date: string, item: string, area: number, unit: string, unitPrice: number, remarks: string, blockId: string, workRetention: number, workRetentionAmount: number): Promise<string>;
    addContractorPayment(contractorId: string, projectId: string, paymentNo: string, date: string, amount: number, paymentMode: string, remarks: string): Promise<string>;
    addPayment(payment: Payment): Promise<void>;
    addProject(project: Project): Promise<void>;
    addSftEntry(contractorId: string, projectId: string, billNo: string, slabNo: string, footings: number, rw: number, columns: number, beams: number, slab: number, oht: number, remarks: string): Promise<string>;
    addUser(profile: UserProfile): Promise<Principal>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkDeleteBillsWithPassword(password: string, billKeys: Array<BillKey>): Promise<void>;
    bulkDeletePayments(password: string, ids: Array<string>): Promise<void>;
    changeAdminPassword(adminEmail: string, oldPwd: string, newPwd: string, confirmPwd: string, newQuestion: string, newAnswer: string): Promise<boolean>;
    deleteBill(projectId: string, billNumber: string, password: string): Promise<void>;
    deleteClient(id: string, password: string): Promise<void>;
    deleteContractorBills(ids: Array<string>, password: string): Promise<void>;
    deleteContractorPayments(ids: Array<string>, password: string): Promise<void>;
    deleteContractors(ids: Array<string>, password: string): Promise<void>;
    deletePayment(id: string, password: string): Promise<void>;
    deleteProject(id: string, password: string): Promise<void>;
    deleteSftEntries(ids: Array<string>, password: string): Promise<void>;
    deleteUsers(password: string, principalIds: Array<string>): Promise<void>;
    filterBills(billFilters: BillFilters): Promise<Array<Bill>>;
    filterBillsByProject(projectId: string): Promise<Array<Bill>>;
    filterPayments(filters: PaymentFilters): Promise<Array<Payment>>;
    filterProjects(filters: ProjectFilters): Promise<Array<Project>>;
    getAdminPasswordQuestion(): Promise<string | null>;
    getAllBills(): Promise<Array<Bill>>;
    getAllClients(): Promise<Array<Client>>;
    getAllPayments(): Promise<Array<Payment>>;
    getAllProjectNames(): Promise<Array<string>>;
    getAllProjects(): Promise<Array<Project>>;
    getBillDetails(projectId: string, billNumber: string): Promise<Bill | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompletedProjectIds(): Promise<Array<string>>;
    getDashboardMetrics(): Promise<DashboardMetrics>;
    getDefaultAdminProfile(): Promise<UserProfile | null>;
    getGreetingMessage(arg0: null): Promise<string>;
    getHintQuestion(): Promise<string | null>;
    getOutstandingAmount(): Promise<number>;
    getPaymentDetails(paymentId: string): Promise<Payment | null>;
    getProjectMapLocations(): Promise<Array<[string, string]>>;
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
    getTickerMessages(): Promise<Array<[string, string]>>;
    getTotalGst(): Promise<number>;
    getUserAccess(email: string): Promise<Array<string>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasActiveProfile(email: string): Promise<boolean>;
    hasProfileSetup(): Promise<boolean>;
    importData(request: ImportRequest, password: string): Promise<void>;
    initializeAccessControl(): Promise<void>;
    isAdminPasswordSet(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    linkMasterAdminPrincipal(): Promise<boolean>;
    linkUserByEmail(email: string): Promise<boolean>;
    listContractorBills(): Promise<Array<{
        id: string;
        area: number;
        date: string;
        blockId: string;
        item: string;
        unit: string;
        contractorId: string;
        projectId: string;
        workRetention: number;
        workRetentionAmount: number;
        unitPrice: number;
        amount: number;
        remarks: string;
        billNo: string;
    }>>;
    listContractorPayments(): Promise<Array<{
        id: string;
        date: string;
        contractorId: string;
        projectId: string;
        paymentNo: string;
        paymentMode: string;
        amount: number;
        remarks: string;
    }>>;
    listContractors(): Promise<Array<{
        id: string;
        contact1: string;
        contact2: string;
        date: string;
        trades: Array<string>;
        name: string;
        note: string;
        unit: string;
        woNo: string;
        completed: boolean;
        email: string;
        link1: string;
        link2: string;
        projectId: string;
        address: string;
        contractingPrice: number;
    }>>;
    listSftEntries(): Promise<Array<{
        id: string;
        rw: number;
        oht: number;
        footings: number;
        slab: number;
        contractorId: string;
        slabNo: string;
        totalSft: number;
        projectId: string;
        beams: number;
        remarks: string;
        billNo: string;
        columns: number;
    }>>;
    listUsers(): Promise<Array<[Principal, UserProfile]>>;
    revealAdminPassword(answer: string): Promise<string | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveTickerMessages(msgs: Array<[string, string]>): Promise<void>;
    setHintQuestionAndAnswer(question: string, answer: string): Promise<void>;
    setProjectMapLocation(projectId: string, location: string): Promise<void>;
    toggleContractorCompleted(id: string): Promise<void>;
    toggleProjectCompleted(id: string): Promise<void>;
    transform(input: http_request_result): Promise<http_request_result>;
    updateBill(bill: Bill, password: string): Promise<void>;
    updateClient(client: Client, password: string): Promise<void>;
    updateContractor(id: string, name: string, trades: Array<string>, projectId: string, date: string, contractingPrice: number, unit: string, contact1: string, contact2: string, email: string, address: string, link1: string, link2: string, note: string, password: string, woNo: string): Promise<void>;
    updateContractorBill(id: string, contractorId: string, projectId: string, billNo: string, date: string, item: string, area: number, unit: string, unitPrice: number, remarks: string, password: string, blockId: string, workRetention: number, workRetentionAmount: number): Promise<void>;
    updateContractorPayment(id: string, contractorId: string, projectId: string, paymentNo: string, date: string, amount: number, paymentMode: string, remarks: string, password: string): Promise<void>;
    updatePayment(payment: Payment, password: string): Promise<void>;
    updateProject(project: Project, password: string): Promise<void>;
    updateSftEntry(id: string, contractorId: string, projectId: string, billNo: string, slabNo: string, footings: number, rw: number, columns: number, beams: number, slab: number, oht: number, remarks: string, password: string): Promise<void>;
    updateUser(userPrincipal: Principal, profile: UserProfile): Promise<void>;
    validateActiveUser(email: string): Promise<void>;
    verifyHintAnswer(answer: string): Promise<string>;
}
