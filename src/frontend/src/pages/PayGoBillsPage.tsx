import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit2,
  Eye,
  FileDown,
  FileText,
  Plus,
  Printer,
  Share2,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type NMRLabourRow,
  type PayGoBill,
  type PayGoNMRBill,
  type WorkflowStep,
  usePayGo,
} from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";
const YEARS = ["2022", "2023", "2024", "2025", "2026"];
const FIN_YEARS = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
const UNITS = [
  "Rft",
  "Sft",
  "Cft",
  "Rmtr",
  "Smtr",
  "Cumtr",
  "Lumsum",
  "Kg",
  "Nos",
];
const ROLES = [
  "Admin",
  "Site Engineer",
  "PM",
  "QC",
  "Billing Engineer",
] as const;
type Role = (typeof ROLES)[number];

function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

const WORKFLOW_STATUS_COLORS: Record<
  PayGoBill["workflowStatus"],
  { bg: string; color: string }
> = {
  "Pending PM Review": { bg: "#FFF3CD", color: "#856404" },
  "PM Approved": { bg: "#CCE5FF", color: "#004085" },
  "QC Approved": { bg: "#E8D5FF", color: "#5a0090" },
  "Billing Approved": { bg: "#D4EDDA", color: "#155724" },
  Rejected: { bg: "#F8D7DA", color: "#721C24" },
};

const PAYMENT_STATUS_COLORS: Record<
  PayGoBill["paymentStatus"],
  { bg: string; color: string }
> = {
  Unpaid: { bg: "#FFF3CD", color: "#856404" },
  "Partially Paid": { bg: "#CCE5FF", color: "#004085" },
  Completed: { bg: "#D4EDDA", color: "#155724" },
};

type NMRStatusColor = Record<
  PayGoNMRBill["status"],
  { bg: string; color: string }
>;
const NMR_STATUS_COLORS: NMRStatusColor = {
  Pending: { bg: "#FFF3CD", color: "#856404" },
  Approved: { bg: "#CCE5FF", color: "#004085" },
  Paid: { bg: "#D4EDDA", color: "#155724" },
};

type BillFilters = {
  project: string;
  contractor: string;
  blockId: string;
  billNo: string;
  year: string;
  financialYear: string;
  startDate: string;
  endDate: string;
};
const emptyBillFilters = (): BillFilters => ({
  project: "",
  contractor: "",
  blockId: "",
  billNo: "",
  year: "",
  financialYear: "",
  startDate: "",
  endDate: "",
});

type BillFormData = {
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
  status: PayGoBill["status"];
  year: string;
  financialYear: string;
  workflowStatus: PayGoBill["workflowStatus"];
  workflowHistory: WorkflowStep[];
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PayGoBill["paymentStatus"];
  amount: number;
};

const emptyBillForm = (engineerName = "Admin"): BillFormData => ({
  project: "",
  contractor: "",
  trade: "",
  subTrade: "",
  blockId: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  unit: "Sft",
  unitPrice: 0,
  qty: 0,
  nos: 1,
  grossAmount: 0,
  debitAmount: 0,
  reasonForDebit: "",
  workRetention: 5,
  retentionAmount: 0,
  netAmount: 0,
  remarks: "",
  attachment1: "",
  attachment2: "",
  engineerName,
  status: "Pending",
  year: new Date().getFullYear().toString(),
  financialYear: "2025-26",
  workflowStatus: "Pending PM Review",
  workflowHistory: [],
  paidAmount: 0,
  remainingAmount: 0,
  paymentStatus: "Unpaid",
  amount: 0,
});

// NMR types
type NMRFilters = {
  project: string;
  contractor: string;
  year: string;
  financialYear: string;
  weekFrom: string;
  weekTo: string;
};
const emptyNMRFilters = (): NMRFilters => ({
  project: "",
  contractor: "",
  year: "",
  financialYear: "",
  weekFrom: "",
  weekTo: "",
});

type NMRFormData = Omit<PayGoNMRBill, "id" | "billNo">;
const emptyNMRForm = (): NMRFormData => ({
  project: "",
  contractor: "",
  trade: "",
  subTrade: "",
  blockId: "",
  description: "",
  rows: [],
  weekFrom: "",
  weekTo: "",
  labourCount: 0,
  totalDays: 0,
  ratePerDay: 0,
  totalAmount: 0,
  status: "Pending",
  workflowStatus: "Pending PM Review",
  workflowHistory: [],
  remarks: "",
  year: "",
  financialYear: "",
});

const toolbarBtnClass =
  "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer";

// Helper to compute workflow badge
function WorkflowBadge({ status }: { status: PayGoBill["workflowStatus"] }) {
  if (status === "Billing Approved") {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{ background: "#D4EDDA" }}
      >
        <CheckCircle size={14} style={{ color: "#155724" }} />
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{ background: "#F8D7DA" }}
      >
        <XCircle size={14} style={{ color: "#721C24" }} />
      </span>
    );
  }
  const labels: Record<string, string> = {
    "Pending PM Review": "PM",
    "PM Approved": "QC",
    "QC Approved": "BE",
  };
  const colors: Record<string, { bg: string; color: string }> = {
    "Pending PM Review": { bg: "#FFF3CD", color: "#856404" },
    "PM Approved": { bg: "#CCE5FF", color: "#004085" },
    "QC Approved": { bg: "#E8D5FF", color: "#5a0090" },
  };
  const label = labels[status] || status;
  const style = colors[status] || { bg: "#e2e3e5", color: "#383d41" };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

// ─── Workflow Action Modal ─────────────────────────────────────────────────────
type WorkflowActionModalProps = {
  bill: PayGoBill;
  currentRole: Role;
  onClose: () => void;
  onAction: (
    step: WorkflowStep["step"],
    action: WorkflowStep["action"],
    remarks: string,
    debitAmount?: number,
    reasonForDebit?: string,
  ) => void;
};

function WorkflowActionModal({
  bill,
  currentRole,
  onClose,
  onAction,
}: WorkflowActionModalProps) {
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "debit" | null
  >(null);
  const [remarks, setRemarks] = useState("");
  const [debitAmt, setDebitAmt] = useState(0);
  const [debitReason, setDebitReason] = useState("");

  const stepMap: Record<string, WorkflowStep["step"]> = {
    PM: "PM",
    QC: "QC",
    "Billing Engineer": "Billing Engineer",
  };

  const canAct = useMemo(() => {
    if (currentRole === "PM" && bill.workflowStatus === "Pending PM Review")
      return true;
    if (currentRole === "QC" && bill.workflowStatus === "PM Approved")
      return true;
    if (
      currentRole === "Billing Engineer" &&
      bill.workflowStatus === "QC Approved"
    )
      return true;
    return false;
  }, [currentRole, bill.workflowStatus]);

  const step = stepMap[currentRole];

  const handleConfirm = () => {
    if (!step) return;
    if (actionType === "approve") {
      onAction(step, "Approved", remarks);
    } else if (actionType === "reject") {
      if (!remarks.trim()) {
        toast.error("Remarks are required for rejection.");
        return;
      }
      onAction(step, "Rejected", remarks);
    } else if (actionType === "debit") {
      if (!debitReason.trim()) {
        toast.error("Reason for debit is required.");
        return;
      }
      if (debitAmt <= 0) {
        toast.error("Debit amount must be greater than 0.");
        return;
      }
      onAction(step, "Added Debit", remarks, debitAmt, debitReason);
    }
  };

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Workflow Actions</h3>
      {!canAct ? (
        <div className="text-sm text-gray-500 italic">
          No actions available for your role ({currentRole}) at current status:{" "}
          {bill.workflowStatus}
        </div>
      ) : (
        <>
          {actionType === null && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActionType("approve")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white"
                style={{ background: GREEN }}
              >
                <CheckCircle size={13} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setActionType("reject")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white"
              >
                <XCircle size={13} /> Reject
              </button>
              {currentRole !== "Billing Engineer" && (
                <button
                  type="button"
                  onClick={() => setActionType("debit")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-500 text-white"
                >
                  <Clock size={13} /> Add Debit
                </button>
              )}
            </div>
          )}
          {actionType === "approve" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Remarks (optional)
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Enter approval remarks..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md text-white"
                  style={{ background: GREEN }}
                >
                  Confirm Approve
                </button>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {actionType === "reject" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-red-600">
                Remarks (required for rejection)
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Enter reason for rejection..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white"
                >
                  Confirm Reject
                </button>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {actionType === "debit" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">
                    Debit Amount (₹)
                  </Label>
                  <Input
                    type="number"
                    value={debitAmt || ""}
                    onChange={(e) => setDebitAmt(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-orange-600">
                    Reason (required)
                  </Label>
                  <Input
                    value={debitReason}
                    onChange={(e) => setDebitReason(e.target.value)}
                    placeholder="Reason for debit..."
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Additional remarks..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-500 text-white"
                >
                  Add Debit
                </button>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Workflow History */}
      {bill.workflowHistory.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
            Workflow History
          </h4>
          <div className="space-y-2">
            {bill.workflowHistory.map((h, idx) => (
              <div
                key={`${h.timestamp}-${idx}`}
                className="flex items-start gap-2 text-xs p-2 rounded-lg"
                style={{
                  background:
                    h.action === "Rejected"
                      ? "#FFF5F5"
                      : h.action === "Added Debit"
                        ? "#FFF8E1"
                        : "#F0FFF4",
                }}
              >
                <span
                  className="font-bold shrink-0"
                  style={{
                    color:
                      h.action === "Rejected"
                        ? "#D32F2F"
                        : h.action === "Added Debit"
                          ? "#F57C00"
                          : GREEN,
                  }}
                >
                  {h.step}
                </span>
                <span className="text-gray-500">→</span>
                <div className="flex-1">
                  <span className="font-semibold text-gray-700">
                    {h.action}
                  </span>
                  {h.action === "Added Debit" && h.debitAmount && (
                    <span className="text-orange-600">
                      {" "}
                      ₹{h.debitAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                  {h.reasonForDebit && (
                    <span className="text-gray-500">
                      {" "}
                      (Reason: {h.reasonForDebit})
                    </span>
                  )}
                  {h.remarks && (
                    <div className="text-gray-500 mt-0.5">{h.remarks}</div>
                  )}
                  <div className="text-gray-400 mt-0.5">
                    {new Date(h.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="border border-gray-300 rounded-md px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Bills Tab Component ──────────────────────────────────────────────────────
function BillsTab({ currentRole }: { currentRole: Role }) {
  const {
    projects,
    contractors,
    bills,
    addBill,
    updateBill,
    deleteBill,
    updateBillWorkflow,
  } = usePayGo();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BillFilters>(emptyBillFilters());
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoBill | null>(null);
  const [form, setForm] = useState<BillFormData>(emptyBillForm(currentRole));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [viewBill, setViewBill] = useState<PayGoBill | null>(null);

  // Auto-update engineer name when role changes (only for new bills)
  useEffect(() => {
    if (!editItem) {
      setForm((f) => ({ ...f, engineerName: currentRole }));
    }
  }, [currentRole, editItem]);

  // Real-time calculations
  useEffect(() => {
    const gross = form.unitPrice * form.qty * form.nos;
    // Apply debit only if reason has more than 20 chars
    const effectiveDebit =
      form.reasonForDebit.length > 20 ? form.debitAmount : 0;
    const retention = ((gross - effectiveDebit) / 100) * form.workRetention;
    const net = gross - effectiveDebit - retention;
    setForm((f) => ({
      ...f,
      grossAmount: gross,
      retentionAmount: retention,
      netAmount: net,
      amount: net,
      remainingAmount: net,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.unitPrice,
    form.qty,
    form.nos,
    form.debitAmount,
    form.reasonForDebit,
    form.workRetention,
  ]);

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );
  const contractorNames = useMemo(
    () => [...new Set(contractors.map((c) => c.name))],
    [contractors],
  );

  // Trades filtered by contractor
  const tradeOptions = useMemo(() => {
    if (!form.contractor) return [];
    return [
      ...new Set(
        contractors
          .filter((c) => c.name === form.contractor)
          .map((c) => c.trade),
      ),
    ];
  }, [form.contractor, contractors]);

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const mP = !filters.project || b.project === filters.project;
      const mC = !filters.contractor || b.contractor === filters.contractor;
      const mBk =
        !filters.blockId ||
        b.blockId.toLowerCase().includes(filters.blockId.toLowerCase());
      const mBn =
        !filters.billNo ||
        b.billNo.toLowerCase().includes(filters.billNo.toLowerCase());
      const mY = !filters.year || b.year === filters.year;
      const mFY =
        !filters.financialYear || b.financialYear === filters.financialYear;
      const mSD = !filters.startDate || b.date >= filters.startDate;
      const mED = !filters.endDate || b.date <= filters.endDate;
      return mP && mC && mBk && mBn && mY && mFY && mSD && mED;
    });
  }, [bills, filters]);

  const totalNet = filtered.reduce(
    (s, b) => s + (b.netAmount || b.amount || 0),
    0,
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyBillForm(currentRole));
    setFormOpen(true);
  };

  const openEdit = (b: PayGoBill) => {
    setEditItem(b);
    setForm({
      project: b.project,
      contractor: b.contractor,
      trade: b.trade,
      subTrade: b.subTrade ?? "",
      blockId: b.blockId,
      date: b.date,
      description: b.description || "",
      unit: b.unit || "Sft",
      unitPrice: b.unitPrice || 0,
      qty: b.qty || 0,
      nos: b.nos || 1,
      grossAmount: b.grossAmount || 0,
      debitAmount: b.debitAmount || 0,
      reasonForDebit: b.reasonForDebit || "",
      workRetention: b.workRetention || 5,
      retentionAmount: b.retentionAmount || 0,
      netAmount: b.netAmount || b.amount || 0,
      remarks: b.remarks,
      attachment1: b.attachment1 || "",
      attachment2: b.attachment2 || "",
      engineerName: b.engineerName || currentRole,
      status: b.status,
      year: b.year,
      financialYear: b.financialYear,
      workflowStatus: b.workflowStatus,
      workflowHistory: b.workflowHistory,
      paidAmount: b.paidAmount || 0,
      remainingAmount: b.remainingAmount || 0,
      paymentStatus: b.paymentStatus || "Unpaid",
      amount: b.amount,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.project || !form.contractor) {
      toast.error("Project and Contractor are required.");
      return;
    }
    if (editItem) {
      updateBill({ ...editItem, ...form });
      toast.success("Bill updated.");
    } else {
      addBill({
        ...form,
        workflowStatus: "Pending PM Review",
        workflowHistory: [],
        paidAmount: 0,
        remainingAmount: form.netAmount,
        paymentStatus: "Unpaid",
        paymentEntries: [],
        amount: form.netAmount,
        status: "Pending",
      });
      toast.success("Bill created and sent for PM review.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteBill(deleteId);
    toast.success("Bill deleted.");
    setDeleteId(null);
    setPw("");
  };

  const clearFilters = () => setFilters(emptyBillFilters());

  const handleContractorChange = (name: string) => {
    setForm((f) => ({ ...f, contractor: name, trade: "", unitPrice: 0 }));
  };

  const handleTradeChange = (trade: string) => {
    const match = contractors.find(
      (c) => c.name === form.contractor && c.trade === trade,
    );
    setForm((f) => ({
      ...f,
      trade,
      unitPrice: match ? match.contractingPrice : f.unitPrice,
      unit: match ? match.unit : f.unit,
    }));
  };

  const handleReasonChange = (val: string) => {
    // First 20 chars: only alphanumeric and spaces allowed
    const first20 = val.slice(0, 20).replace(/[^a-zA-Z0-9 ]/g, "");
    const rest = val.slice(20);
    setForm((f) => ({ ...f, reasonForDebit: first20 + rest }));
  };

  const handleWorkflowAction = (
    step: WorkflowStep["step"],
    action: WorkflowStep["action"],
    remarks: string,
    debitAmount?: number,
    reasonForDebit?: string,
  ) => {
    if (!viewBill) return;
    updateBillWorkflow(
      viewBill.id,
      step,
      action,
      remarks,
      debitAmount,
      reasonForDebit,
    );
    toast.success(
      `Bill ${
        action === "Approved"
          ? "approved"
          : action === "Rejected"
            ? "rejected"
            : "debit added"
      } successfully.`,
    );
    setViewBill(null);
  };

  const handleShare = (b: PayGoBill) => {
    const grossAmt = b.unitPrice * b.qty * b.nos;
    const debits = b.workflowHistory
      .filter((h) => h.action === "Added Debit")
      .reduce((s, h) => s + (h.debitAmount || 0), 0);
    const text = `Bill Receipt\nBill No: ${b.billNo}\nProject: ${b.project}\nTrade: ${b.trade}\nSub-Trade: ${b.subTrade || "—"}\nBlock ID: ${b.blockId}\nDate: ${fmtDate(b.date)}\nDescription: ${b.description}\nUnit Price: ${formatINR(b.unitPrice)}\nQty: ${b.qty}\nNo's: ${b.nos}\nGross Amount: ${formatINR(grossAmt)}\nDebits: ${formatINR(debits)}\nNet Amount: ${formatINR(b.netAmount || b.amount)}\nEngineer: ${b.engineerName}\nStatus: ${b.workflowStatus}`;
    if (navigator.share) {
      navigator
        .share({ title: "Bill Receipt", text })
        .catch(() => window.print());
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Details copied to clipboard."))
        .catch(() => window.print());
    }
  };

  const exportCSV = () => {
    const h = [
      "Bill No",
      "Project",
      "Contractor",
      "Trade",
      "Sub Trade",
      "Block ID",
      "Date",
      "Gross Amount",
      "Net Amount",
      "Workflow Status",
    ];
    const rows = filtered.map((b) => [
      b.billNo,
      b.project,
      b.contractor,
      b.trade,
      b.subTrade ?? "",
      b.blockId,
      b.date,
      b.grossAmount || 0,
      b.netAmount || b.amount,
      b.workflowStatus,
    ]);
    const csv = [h, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-bills.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const canCreateBill =
    currentRole === "Admin" || currentRole === "Site Engineer";

  const effectiveDebit = (b: PayGoBill) => {
    return (
      b.workflowHistory
        .filter((h) => h.action === "Added Debit")
        .reduce((s, h) => s + (h.debitAmount || 0), 0) +
      (b.reasonForDebit && b.reasonForDebit.length > 20 ? b.debitAmount : 0)
    );
  };

  const totalGross = filtered.reduce(
    (s, b) => s + b.unitPrice * b.qty * b.nos,
    0,
  );
  const totalDebit = filtered.reduce((s, b) => s + effectiveDebit(b), 0);
  const totalRetention = filtered.reduce((s, b) => {
    if (b.workflowStatus !== "Billing Approved") return s;
    return s + (b.retentionAmount || 0);
  }, 0);

  const isAdmin = currentRole === "Admin";

  return (
    <div className="flex flex-col gap-0">
      {/* Summary Boxes */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
          style={{ background: "linear-gradient(135deg, #1565C0, #1976D2)" }}
        >
          <span className="text-xs text-blue-100 font-medium">Gross Total</span>
          <span className="text-lg font-bold text-white">
            {formatINR(totalGross)}
          </span>
          <span className="text-xs text-blue-200">{filtered.length} bills</span>
        </div>
        <div
          className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
          style={{ background: "linear-gradient(135deg, #E65100, #F57C00)" }}
        >
          <span className="text-xs text-orange-100 font-medium">
            Debit Total
          </span>
          <span className="text-lg font-bold text-white">
            {formatINR(totalDebit)}
          </span>
          <span className="text-xs text-orange-200">all debits combined</span>
        </div>
        <div
          className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
          style={{ background: "linear-gradient(135deg, #6A1B9A, #8E24AA)" }}
        >
          <span className="text-xs text-purple-100 font-medium">
            Retention Total
          </span>
          <span className="text-lg font-bold text-white">
            {formatINR(totalRetention)}
          </span>
          <span className="text-xs text-purple-200">BE-approved bills</span>
        </div>
        <div
          className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
          style={{ background: "linear-gradient(135deg, #1B5E20, #2E7D32)" }}
        >
          <span className="text-xs text-green-100 font-medium">Net Total</span>
          <span className="text-lg font-bold text-white">
            {formatINR(totalNet)}
          </span>
          <span className="text-xs text-green-200">
            gross - debit - retention
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className={toolbarBtnClass}
          >
            <Printer size={14} /> Print
          </button>
          <button type="button" className={toolbarBtnClass}>
            <FileText size={14} /> Export PDF
          </button>
          {isAdmin && (
            <button type="button" className={toolbarBtnClass}>
              <Upload size={14} /> Import CSV
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={exportCSV}
              className={toolbarBtnClass}
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          {isAdmin && (
            <button type="button" className={toolbarBtnClass}>
              <FileDown size={14} /> Download Format
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canCreateBill && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
              style={{ background: GREEN }}
              data-ocid="paygo.bills.primary_button"
            >
              <Plus size={16} /> New Bill
            </button>
          )}
          {/* Summary card */}
          <div
            className="rounded-xl px-4 py-2 text-white text-sm font-bold shadow-md flex flex-col items-end"
            style={{ background: "linear-gradient(135deg, #FF6B35, #E53935)" }}
          >
            <span className="text-xs font-normal opacity-90">
              Total Bills Amount
            </span>
            <span className="text-base font-bold">{formatINR(totalNet)}</span>
            <span className="text-xs opacity-80">{filtered.length} bills</span>
          </div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="px-4 py-2 bg-white border-b flex items-center justify-start">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Filter card */}
      {showFilters && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="rounded-xl shadow-sm border"
            style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 py-4">
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Projects
                </span>
                <select
                  value={filters.project}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, project: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">All Projects</option>
                  {projectNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Contractor
                </span>
                <select
                  value={filters.contractor}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, contractor: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">All Contractors</option>
                  {contractorNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Block ID
                </span>
                <input
                  value={filters.blockId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, blockId: e.target.value }))
                  }
                  placeholder="Search block ID..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Bill No
                </span>
                <input
                  value={filters.billNo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, billNo: e.target.value }))
                  }
                  placeholder="Exact bill number..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Start Date
                </span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  End Date
                </span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center justify-between border-t border-yellow-200 pt-2">
              <span className="text-sm text-gray-500">
                Showing <strong>{filtered.length}</strong> of{" "}
                <strong>{bills.length}</strong> bills
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1 hover:bg-red-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: GREEN }}>
                  {[
                    "SI No",
                    "Bill No",
                    "Project",
                    "Trade",
                    "Sub Trade",
                    "Block ID",
                    "Date",
                    "Description",
                    "Unit",
                    "Unit Price",
                    "Qty",
                    "No's",
                    "Gross Amt",
                    "Debits",
                    "WR %",
                    "Retention",
                    "Net Amt",
                    "Workflow",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2.5 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={19}
                      className="px-4 py-10 text-center text-gray-400 text-sm"
                      data-ocid="paygo.bills.empty_state"
                    >
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => {
                    const grossAmt = b.unitPrice * b.qty * b.nos;
                    const debitsTotal = effectiveDebit(b);
                    const retentionAmt =
                      ((grossAmt - debitsTotal) / 100) * b.workRetention;
                    const netAmt = grossAmt - debitsTotal - retentionAmt;
                    return (
                      <tr
                        key={b.id}
                        style={{ background: i % 2 === 0 ? "#FFF8F0" : "#fff" }}
                        data-ocid={`paygo.bills.item.${i + 1}`}
                      >
                        <td className="px-2.5 py-2.5 text-gray-500">{i + 1}</td>
                        <td className="px-2.5 py-2.5 font-mono font-semibold text-gray-700 whitespace-nowrap">
                          {b.billNo}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-700 max-w-[80px] truncate">
                          {b.project}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">
                          {b.trade}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-500">
                          {b.subTrade || "—"}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">
                          {b.blockId}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap">
                          {fmtDate(b.date)}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600 max-w-[100px] truncate">
                          {b.description || "—"}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">
                          {b.unit}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-700 whitespace-nowrap">
                          {formatINR(b.unitPrice)}
                        </td>
                        <td className="px-2.5 py-2.5 text-center">{b.qty}</td>
                        <td className="px-2.5 py-2.5 text-center">{b.nos}</td>
                        <td className="px-2.5 py-2.5 font-medium text-blue-700 whitespace-nowrap">
                          {formatINR(grossAmt)}
                        </td>
                        <td className="px-2.5 py-2.5 font-medium text-orange-600 whitespace-nowrap">
                          {formatINR(debitsTotal)}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">
                          {b.workflowStatus === "Billing Approved"
                            ? `${b.workRetention}%`
                            : "0%"}
                        </td>
                        <td className="px-2.5 py-2.5 font-medium text-purple-600 whitespace-nowrap">
                          {b.workflowStatus === "Billing Approved"
                            ? formatINR(retentionAmt)
                            : formatINR(0)}
                        </td>
                        <td
                          className="px-2.5 py-2.5 font-medium whitespace-nowrap"
                          style={{ color: GREEN }}
                        >
                          {formatINR(netAmt)}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <WorkflowBadge status={b.workflowStatus} />
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewBill(b)}
                              title="View"
                              className="text-blue-500 hover:text-blue-700"
                              data-ocid={`paygo.bills.edit_button.${i + 1}`}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const grossAmt = b.unitPrice * b.qty * b.nos;
                                const debits =
                                  b.workflowHistory
                                    .filter((h) => h.action === "Added Debit")
                                    .reduce(
                                      (s, h) => s + (h.debitAmount || 0),
                                      0,
                                    ) +
                                  (b.reasonForDebit &&
                                  b.reasonForDebit.length > 20
                                    ? b.debitAmount
                                    : 0);
                                const w = window.open(
                                  "",
                                  "_blank",
                                  "width=900,height=700",
                                );
                                if (!w) {
                                  window.print();
                                  return;
                                }
                                w.document.write(`<!DOCTYPE html><html><head><title>Bill ${b.billNo}</title><style>
                                  body{font-family:Arial,sans-serif;margin:24px;color:#222;}
                                  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
                                  .title{font-size:22px;font-weight:bold;}
                                  .bill-no{font-size:20px;font-weight:bold;color:#D32F2F;text-align:center;}
                                  .date{font-size:12px;text-align:right;}
                                  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0;border:1px solid #ccc;padding:12px;border-radius:6px;}
                                  .col-label{font-size:11px;color:#555;font-weight:600;}
                                  .col-val{font-size:12px;font-weight:700;}
                                  table{width:100%;border-collapse:collapse;margin:12px 0;}
                                  th{background:#1565C0;color:#fff;padding:7px 10px;font-size:11px;text-align:left;}
                                  td{padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;}
                                  tr:nth-child(even)td{background:#f5f9ff;}
                                  .totals{margin-top:8px;text-align:right;}
                                  .totals div{padding:3px 0;font-size:12px;}
                                  .total-row{font-weight:bold;font-size:14px;}
                                  .debit-note{margin:10px 0;padding:8px;background:#FFF8E1;border-left:3px solid #FFA000;font-size:11px;}
                                  .sig-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:24px;}
                                  .sig-box{text-align:center;border-top:1px solid #888;padding-top:4px;font-size:10px;color:#555;}
                                  @media print{body{margin:8mm;}}
                                </style></head><body>
                                <div class="header">
                                  <div class="title">Bill</div>
                                  <div class="bill-no">${b.billNo}</div>
                                  <div class="date">${b.date.split("-").reverse().join("-")}</div>
                                </div>
                                <div class="two-col">
                                  <div>
                                    <div class="col-label">Company</div><div class="col-val">MPH Developers</div>
                                    <div class="col-label" style="margin-top:6px">Project</div><div class="col-val">${b.project}</div>
                                    <div class="col-label" style="margin-top:6px">Block ID</div><div class="col-val">${b.blockId || "—"}</div>
                                  </div>
                                  <div>
                                    <div class="col-label">Contractor</div><div class="col-val">${b.contractor}</div>
                                     <div class="col-label" style="margin-top:6px">Trade / Sub-Trade</div><div class="col-val">${b.trade}${b.subTrade ? ` / ${b.subTrade}` : ""}</div>
                                    <div class="col-label" style="margin-top:6px">Engineer</div><div class="col-val">${b.engineerName || "—"}</div>
                                  </div>
                                </div>
                                ${b.description ? `<div style="font-size:12px;margin:8px 0;"><strong>Description:</strong> ${b.description}</div>` : ""}
                                <table>
                                  <thead><tr><th>SI No</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price ₹</th><th>No's</th><th>Amount ₹</th></tr></thead>
                                  <tbody>
                                    <tr>
                                      <td>1</td>
                                      <td>${b.description || b.blockId}</td>
                                      <td>${b.qty}</td>
                                      <td>${b.unit}</td>
                                      <td>${b.unitPrice.toLocaleString("en-IN")}</td>
                                      <td>${b.nos}</td>
                                      <td>${grossAmt.toLocaleString("en-IN")}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                <div class="totals">
                                  <div>SUBTOTAL: ₹${grossAmt.toLocaleString("en-IN")}</div>
                                  <div style="color:#D32F2F">TOTAL DEBITS: ₹${debits.toLocaleString("en-IN")}</div>
                                  ${b.workflowStatus === "Billing Approved" ? `<div style="color:#D32F2F">WORK RETENTION (${b.workRetention}%): ₹${(b.retentionAmount || 0).toLocaleString("en-IN")}</div>` : ""}
                                  <div class="total-row">TOTAL: ₹${(b.netAmount || b.amount).toLocaleString("en-IN")}</div>
                                </div>
                                ${b.reasonForDebit && b.reasonForDebit.length > 20 ? `<div class="debit-note"><strong>Debit Note:</strong> ${b.reasonForDebit}</div>` : ""}
                                <div class="sig-row">
                                  <div class="sig-box">Contractor</div>
                                  <div class="sig-box">Site Engineer</div>
                                  <div class="sig-box">PM</div>
                                  <div class="sig-box">QC</div>
                                  <div class="sig-box">Billing Engineer / MD</div>
                                </div>
                                </body></html>`);
                                w.document.close();
                                w.focus();
                                setTimeout(() => w.print(), 400);
                              }}
                              title="Print"
                              className="text-purple-500 hover:text-purple-700"
                              data-ocid={`paygo.bills.print_button.${i + 1}`}
                            >
                              <Printer size={13} />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openEdit(b)}
                                title="Edit"
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteId(b.id);
                                  setPw("");
                                }}
                                title="Delete"
                                className="text-red-500 hover:text-red-700"
                                data-ocid={`paygo.bills.delete_button.${i + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New/Edit Bill Form Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) setFormOpen(false);
        }}
      >
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-y-auto"
          data-ocid="paygo.bills.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Bill" : "New Bill — MPH Construction"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            {/* Row 1: Project (full width) */}
            <div className="col-span-3">
              <Label className="text-xs font-semibold">
                Project <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm((f) => ({ ...f, project: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projectNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Bill No (auto), Date, Engineer */}
            <div>
              <Label className="text-xs font-semibold">Bill No</Label>
              <Input
                value={(() => {
                  if (!form.project) return "";
                  const prefix = form.project.slice(0, 2).toUpperCase();
                  if (editItem) return editItem.billNo;
                  const existing = bills.filter((b) =>
                    b.billNo.startsWith(prefix),
                  );
                  const next = existing.length + 1;
                  return `${prefix}${String(next).padStart(3, "0")}`;
                })()}
                readOnly
                className="bg-gray-50 text-gray-500 font-mono font-semibold"
                placeholder="Select project first"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Engineer Name</Label>
              <Input
                value={form.engineerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, engineerName: e.target.value }))
                }
                placeholder="Engineer Name"
              />
            </div>

            {/* Row 3: Contractor, Trade, Sub-Trade, Block ID */}
            <div>
              <Label className="text-xs font-semibold">
                Contractor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.contractor}
                onValueChange={handleContractorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractorNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Trade</Label>
              <Select
                value={form.trade}
                onValueChange={handleTradeChange}
                disabled={!form.contractor}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.contractor
                        ? "Select Trade"
                        : "Select contractor first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {tradeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Sub-Trade</Label>
              <Input
                value={form.subTrade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subTrade: e.target.value }))
                }
                placeholder="Sub-Trade"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Block ID</Label>
              <Input
                value={form.blockId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, blockId: e.target.value }))
                }
                placeholder="e.g. BLK-A1"
              />
            </div>

            {/* Row 4: Description (full width) */}
            <div className="col-span-3">
              <Label className="text-xs font-semibold">
                Description of Work
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Describe the work performed..."
              />
            </div>

            {/* Row 5: Unit, Unit Price */}
            <div>
              <Label className="text-xs font-semibold">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Unit Price (₹)</Label>
              <Input
                type="number"
                value={form.unitPrice || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>
            <div />

            {/* Row 6: Qty, No's */}
            <div>
              <Label className="text-xs font-semibold">Quantity (Qty)</Label>
              <Input
                type="number"
                value={form.qty || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, qty: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">No&apos;s</Label>
              <Input
                type="number"
                value={form.nos || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nos: Number(e.target.value) }))
                }
                placeholder="1"
              />
            </div>
            <div />

            {/* Row 7: Debit Amount, Reason for Debit */}
            <div>
              <Label className="text-xs font-semibold">Debit Amount (₹)</Label>
              <Input
                type="number"
                value={form.debitAmount || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    debitAmount: Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">
                Reason for Debit
                <span className="text-orange-500 text-xs font-normal ml-1">
                  (first 20 chars: no special chars; debit applies only if
                  &gt;20 chars)
                </span>
              </Label>
              <Textarea
                value={form.reasonForDebit}
                onChange={(e) => handleReasonChange(e.target.value)}
                rows={2}
                placeholder="Enter reason for debit (min 20 chars to activate debit)..."
              />
              {form.debitAmount > 0 && form.reasonForDebit.length <= 20 && (
                <span className="text-xs text-orange-500 mt-0.5 block">
                  ⚠ Debit will not apply — enter more than 20 characters
                </span>
              )}
              {form.reasonForDebit.length > 0 && (
                <span className="text-xs text-gray-400 mt-0.5 block">
                  {form.reasonForDebit.length} chars{" "}
                  {form.reasonForDebit.length > 20
                    ? "✅ debit active"
                    : `(${20 - form.reasonForDebit.length} more needed)`}
                </span>
              )}
            </div>

            {/* WR% and Retention — only for Billing Engineer */}
            {currentRole === "Billing Engineer" && (
              <>
                <div>
                  <Label className="text-xs font-semibold">
                    Work Retention (%)
                  </Label>
                  <Input
                    type="number"
                    value={form.workRetention || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        workRetention: Number(e.target.value),
                      }))
                    }
                    placeholder="5"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Retention Amount (₹)
                  </Label>
                  <Input
                    value={formatINR(form.retentionAmount)}
                    readOnly
                    className="font-semibold"
                    style={{ background: "#E8F5E9", color: "#2E7D32" }}
                  />
                </div>
                <div />
              </>
            )}

            {/* Calculation Summary Box */}
            <div className="col-span-3">
              <div
                className="rounded-xl border p-4"
                style={{ background: "#F8FFF8", borderColor: GREEN }}
              >
                <div className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                  Calculation Summary
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-500 font-semibold">
                      Gross Amount
                    </div>
                    <div className="font-bold text-blue-800 text-base mt-0.5">
                      {formatINR(form.grossAmount)}
                    </div>
                    <div className="text-xs text-blue-400 mt-0.5">
                      {form.unitPrice} × {form.qty} × {form.nos}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-orange-500 font-semibold">
                      Effective Debit
                    </div>
                    <div className="font-bold text-orange-800 text-base mt-0.5">
                      {formatINR(
                        form.reasonForDebit.length > 20 ? form.debitAmount : 0,
                      )}
                    </div>
                    {form.debitAmount > 0 &&
                      form.reasonForDebit.length <= 20 && (
                        <div className="text-xs text-orange-400 mt-0.5">
                          (inactive)
                        </div>
                      )}
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-semibold">
                      Net Amount
                    </div>
                    <div className="font-bold text-green-800 text-base mt-0.5">
                      {formatINR(form.netAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments and Remarks */}
            <div>
              <Label className="text-xs font-semibold">
                Attachment 1 (Link)
              </Label>
              <Input
                value={form.attachment1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, attachment1: e.target.value }))
                }
                placeholder="https://..."
                type="url"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Attachment 2 (Link)
              </Label>
              <Input
                value={form.attachment2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, attachment2: e.target.value }))
                }
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                rows={2}
                placeholder="Additional remarks..."
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              data-ocid="paygo.bills.cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md px-4 py-2 text-sm text-white font-semibold"
              style={{ background: GREEN }}
              data-ocid="paygo.bills.save_button"
            >
              {editItem ? "Update Bill" : "Create Bill"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bill Receipt Dialog */}
      {viewBill && (
        <Dialog open={!!viewBill} onOpenChange={() => setViewBill(null)}>
          <DialogContent
            className="max-w-2xl max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden"
            style={{ border: "3px solid #FF6B35" }}
            data-ocid="paygo.bills.modal"
          >
            {/* Receipt header with icons */}
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Bill Receipt — {viewBill.billNo}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(viewBill)}
                  title="Share"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Share2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewBill(null)}
                  title="Close"
                  className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  data-ocid="paygo.bills.close_button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex gap-2 flex-wrap mt-2 mb-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={WORKFLOW_STATUS_COLORS[viewBill.workflowStatus]}
              >
                {viewBill.workflowStatus}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={
                  PAYMENT_STATUS_COLORS[viewBill.paymentStatus || "Unpaid"]
                }
              >
                Payment: {viewBill.paymentStatus || "Unpaid"}
              </span>
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(
                [
                  ["Bill No", viewBill.billNo],
                  ["Project", viewBill.project],
                  ["Contractor", viewBill.contractor],
                  ["Trade", viewBill.trade],
                  ["Sub-Trade", viewBill.subTrade || "—"],
                  ["Block ID", viewBill.blockId],
                  ["Date", fmtDate(viewBill.date)],
                  ["Engineer", viewBill.engineerName || "—"],
                  ["Unit", viewBill.unit || "—"],
                  ["Unit Price", formatINR(viewBill.unitPrice || 0)],
                  ["Qty", String(viewBill.qty || 0)],
                  ["No's", String(viewBill.nos || 1)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    {k}:
                  </span>
                  <span className="text-gray-800 text-xs">{v || "—"}</span>
                </div>
              ))}
            </div>

            {viewBill.description && (
              <div className="mt-3 text-sm">
                <span className="font-semibold text-gray-600 text-xs">
                  Description:
                </span>
                <p className="text-gray-700 mt-0.5 text-xs">
                  {viewBill.description}
                </p>
              </div>
            )}

            {/* Amounts summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-500 font-semibold">
                  Gross Amount
                </div>
                <div className="font-bold text-blue-800">
                  {formatINR(viewBill.unitPrice * viewBill.qty * viewBill.nos)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-orange-500 font-semibold">
                  Debits
                </div>
                <div className="font-bold text-orange-800">
                  {formatINR(effectiveDebit(viewBill))}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-500 font-semibold">
                  Retention Amt
                </div>
                <div className="font-bold text-purple-800">
                  {formatINR(viewBill.retentionAmount || 0)}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-semibold">
                  Net Amount
                </div>
                <div className="font-bold text-green-800">
                  {formatINR(viewBill.netAmount || viewBill.amount)}
                </div>
              </div>
            </div>

            {/* Payment tracking */}
            {viewBill.workflowStatus === "Billing Approved" && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">
                    Paid
                  </div>
                  <div className="font-bold text-gray-700">
                    {formatINR(viewBill.paidAmount || 0)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-500 font-semibold">
                    Remaining
                  </div>
                  <div className="font-bold text-red-700">
                    {formatINR(viewBill.remainingAmount || 0)}
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{
                    background:
                      PAYMENT_STATUS_COLORS[viewBill.paymentStatus || "Unpaid"]
                        .bg,
                  }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{
                      color:
                        PAYMENT_STATUS_COLORS[
                          viewBill.paymentStatus || "Unpaid"
                        ].color,
                    }}
                  >
                    Status
                  </div>
                  <div
                    className="font-bold"
                    style={{
                      color:
                        PAYMENT_STATUS_COLORS[
                          viewBill.paymentStatus || "Unpaid"
                        ].color,
                    }}
                  >
                    {viewBill.paymentStatus || "Unpaid"}
                  </div>
                </div>
              </div>
            )}

            {/* Reason for debit (view only) */}
            {viewBill.reasonForDebit && (
              <div className="mt-2 text-xs">
                <span className="font-semibold text-orange-600">
                  Reason for Debit:
                </span>
                <span className="text-gray-700 ml-1">
                  {viewBill.reasonForDebit}
                </span>
              </div>
            )}

            {/* Debit Breakdown */}
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wide">
                Debit Breakdown
              </div>
              {(() => {
                const engineerDebit =
                  viewBill.reasonForDebit && viewBill.reasonForDebit.length > 20
                    ? viewBill.debitAmount
                    : 0;
                const pmDebit = viewBill.workflowHistory
                  .filter((h) => h.step === "PM" && h.action === "Added Debit")
                  .reduce((s, h) => s + (h.debitAmount || 0), 0);
                const qcDebit = viewBill.workflowHistory
                  .filter((h) => h.step === "QC" && h.action === "Added Debit")
                  .reduce((s, h) => s + (h.debitAmount || 0), 0);
                const totalDeb = engineerDebit + pmDebit + qcDebit;
                return (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-xs text-gray-500">
                        Engineer Debit
                      </div>
                      <div className="font-bold text-orange-700">
                        {formatINR(engineerDebit)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-xs text-gray-500">PM Debit</div>
                      <div className="font-bold text-orange-700">
                        {formatINR(pmDebit)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-xs text-gray-500">QC Debit</div>
                      <div className="font-bold text-orange-700">
                        {formatINR(qcDebit)}
                      </div>
                    </div>
                    <div className="text-center bg-orange-100 rounded p-2 border border-orange-300">
                      <div className="text-xs text-gray-600 font-semibold">
                        Total Debit
                      </div>
                      <div className="font-bold text-orange-900">
                        {formatINR(totalDeb)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Remarks (view only) */}
            {viewBill.remarks && (
              <div className="mt-2 text-xs">
                <span className="font-semibold text-gray-600">Remarks:</span>
                <span className="text-gray-700 ml-1">{viewBill.remarks}</span>
              </div>
            )}

            {(viewBill.attachment1 || viewBill.attachment2) && (
              <div className="mt-2 text-xs flex gap-4">
                {viewBill.attachment1 && (
                  <a
                    href={viewBill.attachment1}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Attachment 1
                  </a>
                )}
                {viewBill.attachment2 && (
                  <a
                    href={viewBill.attachment2}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Attachment 2
                  </a>
                )}
              </div>
            )}

            {/* Workflow Actions */}
            <WorkflowActionModal
              bill={viewBill}
              currentRole={currentRole}
              onClose={() => setViewBill(null)}
              onAction={handleWorkflowAction}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent data-ocid="paygo.bills.dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this bill.
          </p>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              data-ocid="paygo.bills.cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 text-sm font-semibold"
              data-ocid="paygo.bills.confirm_button"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── NMR Bills Tab Component ──────────────────────────────────────────────────
// NMR Labour row default rates (stored in localStorage)
const NMR_RATES_KEY = "paygo_nmr_rates";
function loadNMRRates(): {
  mason: number;
  maleHelper: number;
  femaleHelper: number;
} {
  try {
    const raw = localStorage.getItem(NMR_RATES_KEY);
    return raw
      ? JSON.parse(raw)
      : { mason: 500, maleHelper: 400, femaleHelper: 350 };
  } catch {
    return { mason: 500, maleHelper: 400, femaleHelper: 350 };
  }
}
function saveNMRRates(rates: {
  mason: number;
  maleHelper: number;
  femaleHelper: number;
}) {
  localStorage.setItem(NMR_RATES_KEY, JSON.stringify(rates));
}
function genNMRId(): string {
  return `nmr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
function calcRowAmount(row: NMRLabourRow): number {
  return (
    row.masonCount * row.masonRate +
    row.maleHelperCount * row.maleHelperRate +
    row.femaleHelperCount * row.femaleHelperRate
  );
}

function NMRBillsTab({ currentRole }: { currentRole: Role }) {
  const {
    projects,
    contractors,
    nmrBills,
    addNMRBill,
    updateNMRBill,
    deleteNMRBill,
  } = usePayGo();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<NMRFilters>(emptyNMRFilters());
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoNMRBill | null>(null);
  const [form, setForm] = useState<NMRFormData>(emptyNMRForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [viewBill, setViewBill] = useState<PayGoNMRBill | null>(null);
  // NMR per-row labour table state
  const [nmrRows, setNMRRows] = useState<NMRLabourRow[]>([
    {
      id: genNMRId(),
      description: "",
      date: new Date().toISOString().split("T")[0],
      masonCount: 0,
      masonRate: 500,
      maleHelperCount: 0,
      maleHelperRate: 400,
      femaleHelperCount: 0,
      femaleHelperRate: 350,
      amount: 0,
    },
  ]);
  const [nmrRates, setNMRRates] = useState(loadNMRRates);
  const [rateEditPw, setRateEditPw] = useState("");
  const [rateEditOpen, setRateEditOpen] = useState(false);
  const [importRef, setImportRef] = useState<HTMLInputElement | null>(null);

  const isAdmin = currentRole === "Admin";

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );
  const contractorNames = useMemo(
    () => [...new Set(contractors.map((c) => c.name))],
    [contractors],
  );

  const filtered = useMemo(() => {
    return nmrBills.filter((b) => {
      const mP = !filters.project || b.project === filters.project;
      const mC = !filters.contractor || b.contractor === filters.contractor;
      const mY = !filters.year || b.year === filters.year;
      const mFY =
        !filters.financialYear || b.financialYear === filters.financialYear;
      const mWF = !filters.weekFrom || b.weekFrom >= filters.weekFrom;
      const mWT = !filters.weekTo || b.weekTo <= filters.weekTo;
      return mP && mC && mY && mFY && mWF && mWT;
    });
  }, [nmrBills, filters]);

  const totalAmount = filtered.reduce((s, b) => s + b.totalAmount, 0);

  const defaultRow = (): NMRLabourRow => ({
    id: genNMRId(),
    description: "",
    date: new Date().toISOString().split("T")[0],
    masonCount: 0,
    masonRate: nmrRates.mason,
    maleHelperCount: 0,
    maleHelperRate: nmrRates.maleHelper,
    femaleHelperCount: 0,
    femaleHelperRate: nmrRates.femaleHelper,
    amount: 0,
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyNMRForm());
    setNMRRows([defaultRow()]);
    setFormOpen(true);
  };
  const openEdit = (b: PayGoNMRBill) => {
    setEditItem(b);
    setForm({
      project: b.project,
      contractor: b.contractor,
      trade: b.trade,
      subTrade: b.subTrade,
      blockId: b.blockId,
      description: b.description,
      rows: b.rows,
      weekFrom: b.weekFrom,
      weekTo: b.weekTo,
      labourCount: b.labourCount ?? 0,
      totalDays: b.totalDays ?? 0,
      ratePerDay: b.ratePerDay ?? 0,
      totalAmount: b.totalAmount,
      status: b.status,
      workflowStatus: b.workflowStatus,
      workflowHistory: b.workflowHistory,
      remarks: b.remarks,
      year: b.year,
      financialYear: b.financialYear,
    });
    setNMRRows(
      b.rows.length > 0 ? b.rows.map((r) => ({ ...r })) : [defaultRow()],
    );
    setFormOpen(true);
  };

  const updateRow = (idx: number, patch: Partial<NMRLabourRow>) => {
    setNMRRows((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, ...patch };
        updated.amount = calcRowAmount(updated);
        return updated;
      }),
    );
  };
  const addRow = () => setNMRRows((rows) => [...rows, defaultRow()]);
  const removeRow = (idx: number) => {
    if (idx === 0) return;
    setNMRRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!form.project || !form.contractor) {
      toast.error("Project and Contractor are required.");
      return;
    }
    const rowsWithAmounts = nmrRows.map((r) => ({
      ...r,
      amount: calcRowAmount(r),
    }));
    const totalAmt = rowsWithAmounts.reduce((s, r) => s + r.amount, 0);
    const finalForm: NMRFormData = {
      ...form,
      rows: rowsWithAmounts,
      totalAmount: totalAmt,
      labourCount: rowsWithAmounts.reduce(
        (s, r) => s + r.masonCount + r.maleHelperCount + r.femaleHelperCount,
        0,
      ),
      totalDays: rowsWithAmounts.length,
      ratePerDay: 0,
      workflowStatus: editItem ? form.workflowStatus : "Pending PM Review",
      workflowHistory: editItem ? form.workflowHistory : [],
      status: editItem ? form.status : "Pending",
    };
    if (editItem) {
      updateNMRBill({ ...editItem, ...finalForm });
      toast.success("NMR Bill updated.");
    } else {
      addNMRBill(finalForm);
      toast.success("NMR Bill created and sent for PM review.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteNMRBill(deleteId);
    toast.success("NMR Bill deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportNMRCSV = () => {
    const h = [
      "Bill No",
      "Project",
      "Contractor",
      "Trade",
      "Week From",
      "Week To",
      "Labour Count",
      "Total Days",
      "Rate/Day",
      "Total Amount",
      "Status",
    ];
    const rows = filtered.map((b) => [
      b.billNo,
      b.project,
      b.contractor,
      b.trade,
      b.weekFrom,
      b.weekTo,
      b.labourCount ?? 0,
      b.totalDays ?? 0,
      b.ratePerDay ?? 0,
      b.totalAmount,
      b.status,
    ]);
    const csv = [h, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-nmr-bills.csv";
    a.click();
    toast.success("NMR CSV exported.");
  };

  const downloadNMRFormat = () => {
    const h = [
      "Project",
      "Contractor",
      "Trade",
      "Sub Trade",
      "Block ID",
      "Week From",
      "Week To",
      "Description",
      "Year",
      "Financial Year",
      "Remarks",
    ];
    const csv = [
      h,
      [
        "Sunrise Towers",
        "Ramesh & Sons",
        "Mason",
        "",
        "BLK-A1",
        "2025-01-01",
        "2025-01-07",
        "Foundation work",
        "2025",
        "2024-25",
        "",
      ],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "nmr-bills-format.csv";
    a.click();
    toast.success("Format downloaded.");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) {
        toast.error("No data rows found.");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (name: string) => headers.findIndex((h) => h.includes(name));
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const project = cols[idx("project")]?.trim() || "";
        const contractor = cols[idx("contractor")]?.trim() || "";
        if (!project || !contractor) continue;
        addNMRBill({
          project,
          contractor,
          trade: cols[idx("trade")]?.trim() || "",
          subTrade: cols[idx("sub")]?.trim() || "",
          blockId: cols[idx("block")]?.trim() || "",
          weekFrom: cols[idx("week from")]?.trim() || "",
          weekTo: cols[idx("week to")]?.trim() || "",
          description: cols[idx("desc")]?.trim() || "",
          rows: [],
          totalAmount: 0,
          labourCount: 0,
          totalDays: 0,
          ratePerDay: 0,
          status: "Pending",
          workflowStatus: "Pending PM Review",
          workflowHistory: [],
          remarks: cols[idx("remark")]?.trim() || "",
          year:
            cols[idx("year")]?.trim() || new Date().getFullYear().toString(),
          financialYear: cols[idx("financial")]?.trim() || "",
        });
        count++;
      }
      toast.success(`Imported ${count} NMR bill(s).`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Hidden import file input */}
      <input
        type="file"
        accept=".csv"
        ref={(el) => setImportRef(el)}
        onChange={handleImportCSV}
        className="hidden"
      />
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className={toolbarBtnClass}
          >
            <Printer size={14} /> Print
          </button>
          <button type="button" className={toolbarBtnClass}>
            <FileText size={14} /> Export PDF
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => importRef?.click()}
              className={toolbarBtnClass}
            >
              <Upload size={14} /> Import CSV
            </button>
          )}
          <button
            type="button"
            onClick={exportNMRCSV}
            className={toolbarBtnClass}
          >
            <Download size={14} /> Export CSV
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={downloadNMRFormat}
              className={toolbarBtnClass}
            >
              <FileDown size={14} /> Download Format
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-sm font-semibold shadow-md hover:opacity-90"
            style={{ background: GREEN }}
          >
            <Plus size={16} /> New NMR Bill
          </button>
          <div
            className="rounded-xl px-4 py-2 text-white text-sm font-bold shadow-md flex flex-col items-end"
            style={{ background: "linear-gradient(135deg, #43A047, #1B5E20)" }}
          >
            <span className="text-xs font-normal opacity-90">
              Total NMR Amount
            </span>
            <span className="text-base font-bold">
              {formatINR(totalAmount)}
            </span>
            <span className="text-xs opacity-80">
              {filtered.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="px-4 py-2 bg-white border-b flex items-center">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="rounded-xl shadow-sm border"
            style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 py-4">
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Projects
                </span>
                <select
                  value={filters.project}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, project: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Projects</option>
                  {projectNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Contractor
                </span>
                <select
                  value={filters.contractor}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, contractor: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Contractors</option>
                  {contractorNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Year
                </span>
                <select
                  value={filters.year}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, year: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Years</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Financial Year
                </span>
                <select
                  value={filters.financialYear}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, financialYear: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All FY</option>
                  {FIN_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Week From
                </span>
                <input
                  type="date"
                  value={filters.weekFrom}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, weekFrom: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Week To
                </span>
                <input
                  type="date"
                  value={filters.weekTo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, weekTo: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center justify-between border-t border-yellow-200 pt-2">
              <span className="text-sm text-gray-500">
                Showing <strong>{filtered.length}</strong> of{" "}
                <strong>{nmrBills.length}</strong> NMR bills
              </span>
              <button
                type="button"
                onClick={() => setFilters(emptyNMRFilters())}
                className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1 hover:bg-red-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: GREEN }}>
                  {[
                    "#",
                    "Bill No",
                    "Project",
                    "Contractor",
                    "Trade",
                    "Week From",
                    "Week To",
                    "Labour",
                    "Days",
                    "Rate/Day",
                    "Total (₹)",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-10 text-center text-gray-400 text-sm"
                    >
                      No NMR bills found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => (
                    <tr
                      key={b.id}
                      style={{ background: i % 2 === 0 ? "#F1F8E9" : "#fff" }}
                    >
                      <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">
                        {b.billNo}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[100px] truncate">
                        {b.project}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {b.contractor}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{b.trade}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(b.weekFrom)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(b.weekTo)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.labourCount ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.totalDays ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatINR(b.ratePerDay ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap text-right">
                        {formatINR(b.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={NMR_STATUS_COLORS[b.status]}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewBill(b)}
                            title="View"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Eye size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEdit(b)}
                              title="Edit"
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteId(b.id);
                                setPw("");
                              }}
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* NMR Form Dialog — per-row labour table */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) setFormOpen(false);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit NMR Bill" : "New NMR Bill"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Project *</Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm((f) => ({ ...f, project: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projectNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Contractor *</Label>
              <Select
                value={form.contractor}
                onValueChange={(v) => {
                  const c = contractors.find((x) => x.name === v);
                  setForm((f) => ({
                    ...f,
                    contractor: v,
                    trade: c?.trade || f.trade,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractorNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Trade</Label>
              <Input
                value={form.trade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trade: e.target.value }))
                }
                placeholder="Trade"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Sub-Trade</Label>
              <Input
                value={form.subTrade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subTrade: e.target.value }))
                }
                placeholder="Sub-Trade"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Week From</Label>
              <Input
                type="date"
                value={form.weekFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weekFrom: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Week To</Label>
              <Input
                type="date"
                value={form.weekTo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weekTo: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Year</Label>
              <Select
                value={form.year}
                onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Financial Year</Label>
              <Select
                value={form.financialYear}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, financialYear: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Financial Year" />
                </SelectTrigger>
                <SelectContent>
                  {FIN_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Description of work..."
              />
            </div>
          </div>

          {/* Per-row Labour Table */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                Labour Entries
              </span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setRateEditOpen(true)}
                    title="Edit /Day rates (Admin)"
                    className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
                  >
                    <Edit2 size={11} /> Rates
                  </button>
                )}
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-white rounded px-2 py-1"
                  style={{ background: GREEN }}
                  title="Add row"
                >
                  <Plus size={12} /> Add Row
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#E8F5E9" }}>
                    {[
                      "SI",
                      "Description",
                      "Date",
                      "Mason",
                      "/Day",
                      "Male Helper",
                      "/Day",
                      "Female Helper",
                      "/Day",
                      "Amount",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nmrRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={{ background: idx % 2 === 0 ? "#fff" : "#F9FBE7" }}
                    >
                      <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-28 border border-gray-200 rounded px-1.5 py-1 text-xs"
                          value={row.description}
                          onChange={(e) =>
                            updateRow(idx, { description: e.target.value })
                          }
                          placeholder="Work desc"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs"
                          value={row.date}
                          onChange={(e) =>
                            updateRow(idx, { date: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                          value={row.masonCount || ""}
                          onChange={(e) =>
                            updateRow(idx, {
                              masonCount: Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-gray-600">₹{row.masonRate}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                          value={row.maleHelperCount || ""}
                          onChange={(e) =>
                            updateRow(idx, {
                              maleHelperCount: Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-gray-600">
                          ₹{row.maleHelperRate}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                          value={row.femaleHelperCount || ""}
                          onChange={(e) =>
                            updateRow(idx, {
                              femaleHelperCount: Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-gray-600">
                          ₹{row.femaleHelperRate}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-green-700 whitespace-nowrap">
                        {formatINR(calcRowAmount(row))}
                      </td>
                      <td className="px-2 py-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove row"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#E8F5E9" }}>
                    <td
                      colSpan={9}
                      className="px-2 py-2 text-right font-bold text-xs text-gray-700"
                    >
                      Total Amount:
                    </td>
                    <td className="px-2 py-2 font-bold text-green-700 text-xs whitespace-nowrap">
                      {formatINR(
                        nmrRows.reduce((s, r) => s + calcRowAmount(r), 0),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="mt-3">
            <Label className="text-xs font-semibold">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
              rows={2}
            />
          </div>

          <DialogFooter className="mt-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md px-4 py-2 text-sm text-white font-semibold"
              style={{ background: GREEN }}
            >
              Save NMR Bill
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Edit Modal — Admin only with password */}
      {rateEditOpen && (
        <Dialog open={rateEditOpen} onOpenChange={setRateEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle style={{ color: GREEN }}>
                Edit /Day Rates
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-gray-500">
                Enter admin password to edit the default /Day rates. Changes
                persist in your browser.
              </p>
              <div>
                <Label className="text-xs font-semibold">Admin Password</Label>
                <Input
                  type="password"
                  value={rateEditPw}
                  onChange={(e) => setRateEditPw(e.target.value)}
                  placeholder="Enter admin password"
                />
              </div>
              {rateEditPw === DEFAULT_PW && (
                <>
                  <div>
                    <Label className="text-xs font-semibold">
                      Mason /Day Rate (₹)
                    </Label>
                    <Input
                      type="number"
                      value={nmrRates.mason}
                      onChange={(e) => {
                        const updated = {
                          ...nmrRates,
                          mason: Number(e.target.value),
                        };
                        setNMRRates(updated);
                        saveNMRRates(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      Male Helper /Day Rate (₹)
                    </Label>
                    <Input
                      type="number"
                      value={nmrRates.maleHelper}
                      onChange={(e) => {
                        const updated = {
                          ...nmrRates,
                          maleHelper: Number(e.target.value),
                        };
                        setNMRRates(updated);
                        saveNMRRates(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      Female Helper /Day Rate (₹)
                    </Label>
                    <Input
                      type="number"
                      value={nmrRates.femaleHelper}
                      onChange={(e) => {
                        const updated = {
                          ...nmrRates,
                          femaleHelper: Number(e.target.value),
                        };
                        setNMRRates(updated);
                        saveNMRRates(updated);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  setRateEditOpen(false);
                  setRateEditPw("");
                }}
                className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* NMR View Dialog */}
      {viewBill && (
        <Dialog open={!!viewBill} onOpenChange={() => setViewBill(null)}>
          <DialogContent
            className="max-w-lg max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden"
            style={{ border: "3px solid #43A047" }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                NMR Bill Details
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewBill(null)}
                  title="Close"
                  className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* Workflow badge */}
            <div className="mt-2 mb-1">
              <WorkflowBadge
                status={viewBill.workflowStatus as PayGoBill["workflowStatus"]}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-2 text-sm">
              {(
                [
                  ["Bill No", viewBill.billNo],
                  ["Project", viewBill.project],
                  ["Contractor", viewBill.contractor],
                  ["Trade", viewBill.trade],
                  ["Sub-Trade", viewBill.subTrade || "—"],
                  ["Week From", fmtDate(viewBill.weekFrom)],
                  ["Week To", fmtDate(viewBill.weekTo)],
                  ["Total Amount", formatINR(viewBill.totalAmount)],
                  ["Status", viewBill.status],
                  ["Remarks", viewBill.remarks],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    {k}:
                  </span>
                  <span className="text-gray-800 text-xs">{v || "—"}</span>
                </div>
              ))}
            </div>
            {/* Labour rows table */}
            {viewBill.rows && viewBill.rows.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: GREEN }}>
                      {[
                        "SI",
                        "Description",
                        "Date",
                        "Mason",
                        "Male Helper",
                        "Female Helper",
                        "Amount",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left text-white font-semibold whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewBill.rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        style={{
                          background: idx % 2 === 0 ? "#fff" : "#F1F8E9",
                        }}
                      >
                        <td className="px-2 py-1.5">{idx + 1}</td>
                        <td className="px-2 py-1.5">{r.description || "—"}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {fmtDate(r.date)}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.masonCount} × ₹{r.masonRate}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.maleHelperCount} × ₹{r.maleHelperRate}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.femaleHelperCount} × ₹{r.femaleHelperRate}
                        </td>
                        <td className="px-2 py-1.5 font-semibold text-green-700">
                          {formatINR(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#E8F5E9" }}>
                      <td
                        colSpan={6}
                        className="px-2 py-2 text-right font-bold text-xs"
                      >
                        Total:
                      </td>
                      <td className="px-2 py-2 font-bold text-green-700 text-xs">
                        {formatINR(viewBill.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {/* Workflow History */}
            {viewBill.workflowHistory &&
              viewBill.workflowHistory.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                    Workflow History
                  </h4>
                  <div className="space-y-1">
                    {viewBill.workflowHistory.map((h, idx) => (
                      <div
                        key={`${h.timestamp}-${idx}`}
                        className="text-xs p-2 rounded"
                        style={{
                          background:
                            h.action === "Rejected" ? "#FFF5F5" : "#F0FFF4",
                        }}
                      >
                        <span
                          className="font-bold"
                          style={{
                            color: h.action === "Rejected" ? "#D32F2F" : GREEN,
                          }}
                        >
                          {h.step}
                        </span>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className="font-semibold text-gray-700">
                          {h.action}
                        </span>
                        {h.remarks && (
                          <span className="text-gray-500 ml-1">
                            ({h.remarks})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this NMR bill.
          </p>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 text-sm font-semibold"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function PayGoBillsPage() {
  const [activeTab, setActiveTab] = useState<"bills" | "nmr">("bills");
  const [currentRole, setCurrentRole] = useState<Role>("Admin");

  return (
    <div className="flex flex-col min-h-full">
      {/* Role Switcher */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Current Role:
        </span>
        <div className="flex gap-1 flex-wrap">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setCurrentRole(r)}
              className="px-3 py-1 text-xs font-semibold rounded-full border transition-all"
              style={{
                background: currentRole === r ? GREEN : "transparent",
                color: currentRole === r ? "#fff" : "#374151",
                borderColor: currentRole === r ? GREEN : "#D1D5DB",
              }}
              data-ocid={"paygo.role.tab"}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto hidden md:block">
          {currentRole === "Admin" || currentRole === "Site Engineer"
            ? "Can create bills"
            : currentRole === "PM"
              ? "Review pending bills"
              : currentRole === "QC"
                ? "Review PM-approved bills"
                : "Final approval before payment"}
        </span>
      </div>

      {/* Tab switcher */}
      <div className="bg-white border-b px-4 flex gap-0">
        <button
          type="button"
          onClick={() => setActiveTab("bills")}
          className="px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
          style={{
            borderColor: activeTab === "bills" ? GREEN : "transparent",
            color: activeTab === "bills" ? GREEN : "#6B7280",
          }}
          data-ocid="paygo.bills.tab"
        >
          Bills
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("nmr")}
          className="px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
          style={{
            borderColor: activeTab === "nmr" ? GREEN : "transparent",
            color: activeTab === "nmr" ? GREEN : "#6B7280",
          }}
          data-ocid="paygo.nmr.tab"
        >
          NMR Bills
        </button>
      </div>

      {activeTab === "bills" ? (
        <BillsTab currentRole={currentRole} />
      ) : (
        <NMRBillsTab currentRole={currentRole} />
      )}
    </div>
  );
}
