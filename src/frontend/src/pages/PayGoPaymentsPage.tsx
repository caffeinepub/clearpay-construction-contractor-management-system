import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  Edit2,
  FileText,
  Plus,
  Printer,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type PayGoBill,
  type PayGoPayment,
  usePayGo,
} from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";
const ROLES = [
  "Admin",
  "Site Engineer",
  "PM",
  "QC",
  "Billing Engineer",
] as const;
type Role = (typeof ROLES)[number];

type FormData = Omit<PayGoPayment, "id" | "paymentNo">;

const emptyForm = (): FormData => ({
  project: "",
  date: "",
  amount: 0,
  paymentMode: "Account",
  reference: "",
  remarks: "",
  status: "Pending",
});

type FilterState = { project: string; mode: string; status: string };

const PAYMENT_STATUS_COLORS: Record<
  PayGoBill["paymentStatus"],
  { bg: string; color: string }
> = {
  Unpaid: { bg: "#FFF3CD", color: "#856404" },
  "Partially Paid": { bg: "#CCE5FF", color: "#004085" },
  Completed: { bg: "#D4EDDA", color: "#155724" },
};

function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

// ─── Pay Bill Dialog ─────────────────────────────────────────────────────
type PayBillDialogProps = {
  bill: PayGoBill;
  onClose: () => void;
  onPay: (billId: string, amount: number) => void;
};

function PayBillDialog({ bill, onClose, onPay }: PayBillDialogProps) {
  const [payAmt, setPayAmt] = useState<number>(bill.remainingAmount || 0);

  const handlePay = () => {
    if (payAmt <= 0) {
      toast.error("Payment amount must be greater than 0.");
      return;
    }
    if (payAmt > (bill.remainingAmount || 0)) {
      toast.error(
        `Payment cannot exceed remaining amount: ${formatINR(bill.remainingAmount || 0)}`,
      );
      return;
    }
    onPay(bill.id, payAmt);
    toast.success(
      payAmt >= (bill.remainingAmount || 0)
        ? "Full payment processed. Bill marked as Completed."
        : `Partial payment of ${formatINR(payAmt)} recorded.`,
    );
    onClose();
  };

  const willBePartial = payAmt < (bill.remainingAmount || 0) && payAmt > 0;
  const willBeComplete = payAmt >= (bill.remainingAmount || 0) && payAmt > 0;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md" data-ocid="paygo.payments.dialog">
        <DialogHeader>
          <DialogTitle style={{ color: GREEN }}>
            Process Payment — {bill.billNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Bill summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Bill No:</span>
              <span className="font-semibold font-mono">{bill.billNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Project:</span>
              <span className="font-medium">{bill.project}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Contractor:</span>
              <span className="font-medium">{bill.contractor}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="text-gray-500">Net Amount:</span>
              <span className="font-bold" style={{ color: GREEN }}>
                {formatINR(bill.netAmount || bill.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Already Paid:</span>
              <span className="font-medium text-gray-700">
                {formatINR(bill.paidAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-semibold">Remaining:</span>
              <span className="font-bold text-red-600">
                {formatINR(bill.remainingAmount || 0)}
              </span>
            </div>
          </div>

          {/* Pay amount input */}
          <div>
            <Label className="text-xs font-semibold">
              Pay Amount (₹)
              <span className="text-gray-400 font-normal ml-1">
                (max: {formatINR(bill.remainingAmount || 0)})
              </span>
            </Label>
            <Input
              type="number"
              value={payAmt || ""}
              onChange={(e) => setPayAmt(Number(e.target.value))}
              max={bill.remainingAmount || 0}
              min={0}
              placeholder="Enter payment amount"
              className="mt-1"
              data-ocid="paygo.payments.input"
            />
          </div>

          {/* Quick fill buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayAmt(bill.remainingAmount || 0)}
              className="text-xs px-3 py-1 rounded-md border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
            >
              Full Payment
            </button>
            <button
              type="button"
              onClick={() =>
                setPayAmt(Math.floor((bill.remainingAmount || 0) / 2))
              }
              className="text-xs px-3 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              50% Partial
            </button>
          </div>

          {/* Outcome preview */}
          {payAmt > 0 && (
            <div
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: willBeComplete
                  ? "#D4EDDA"
                  : willBePartial
                    ? "#CCE5FF"
                    : "#f9f9f9",
                color: willBeComplete
                  ? "#155724"
                  : willBePartial
                    ? "#004085"
                    : "#666",
              }}
            >
              {willBeComplete
                ? "✅ Will mark bill as COMPLETED"
                : willBePartial
                  ? `🟡 Partially Paid — Remaining: ${formatINR((bill.remainingAmount || 0) - payAmt)}`
                  : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="paygo.payments.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            style={{ background: GREEN, color: "#fff" }}
            data-ocid="paygo.payments.submit_button"
          >
            <CreditCard size={14} className="mr-1" />
            Pay {formatINR(payAmt)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bills Payment Tab ───────────────────────────────────────────────────────
function BillsPaymentTab({ currentRole }: { currentRole: Role }) {
  const { bills, payBill } = usePayGo();
  const canPayOrEdit =
    currentRole === "Admin" || currentRole === "Billing Engineer";
  const [payingBill, setPayingBill] = useState<PayGoBill | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "all" | PayGoBill["paymentStatus"]
  >("all");
  const [filterProject, setFilterProject] = useState("");
  const [filterContractor, setFilterContractor] = useState("");

  const approvedBills = useMemo(
    () => bills.filter((b) => b.workflowStatus === "Billing Approved"),
    [bills],
  );

  const projectNames = useMemo(
    () => [...new Set(approvedBills.map((b) => b.project))],
    [approvedBills],
  );

  const contractorNames = useMemo(
    () => [...new Set(approvedBills.map((b) => b.contractor))],
    [approvedBills],
  );

  const filtered = useMemo(
    () =>
      approvedBills.filter((b) => {
        const mStatus =
          filterStatus === "all" ||
          (b.paymentStatus || "Unpaid") === filterStatus;
        const mProject = !filterProject || b.project === filterProject;
        const mContractor =
          !filterContractor || b.contractor === filterContractor;
        return mStatus && mProject && mContractor;
      }),
    [approvedBills, filterStatus, filterProject, filterContractor],
  );

  const totalNet = filtered.reduce(
    (s, b) => s + (b.netAmount || b.amount || 0),
    0,
  );
  const totalPaid = filtered.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalRemaining = filtered.reduce(
    (s, b) => s + (b.remainingAmount || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Summary cards */}
      <div className="px-4 py-3 flex gap-3 flex-wrap">
        <div
          className="rounded-xl px-4 py-3 text-white font-bold shadow-md flex flex-col"
          style={{ background: "linear-gradient(135deg, #1976D2, #0D47A1)" }}
        >
          <span className="text-xs font-normal opacity-90">
            Total Net Bills
          </span>
          <span className="text-lg">{formatINR(totalNet)}</span>
          <span className="text-xs opacity-75">
            {filtered.length} bills approved
          </span>
        </div>
        <div
          className="rounded-xl px-4 py-3 text-white font-bold shadow-md flex flex-col"
          style={{ background: "linear-gradient(135deg, #43A047, #1B5E20)" }}
        >
          <span className="text-xs font-normal opacity-90">Total Paid</span>
          <span className="text-lg">{formatINR(totalPaid)}</span>
        </div>
        <div
          className="rounded-xl px-4 py-3 text-white font-bold shadow-md flex flex-col"
          style={{ background: "linear-gradient(135deg, #E53935, #B71C1C)" }}
        >
          <span className="text-xs font-normal opacity-90">
            Total Remaining
          </span>
          <span className="text-lg">{formatINR(totalRemaining)}</span>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="px-4 py-2 bg-white border-b flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
        {(filterProject || filterContractor || filterStatus !== "all") && (
          <button
            type="button"
            onClick={() => {
              setFilterProject("");
              setFilterContractor("");
              setFilterStatus("all");
            }}
            className="ml-2 text-xs font-medium text-red-500 hover:text-red-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Filters card */}
      {showFilters && (
        <div className="px-4 pb-3 pt-2">
          <div
            className="rounded-xl shadow-sm border p-4"
            style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Project
                </span>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
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
                  value={filterContractor}
                  onChange={(e) => setFilterContractor(e.target.value)}
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
                  Payment Status
                </span>
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as typeof filterStatus)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="all">All</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFilterProject("");
                  setFilterContractor("");
                  setFilterStatus("all");
                }}
                className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bills Payment Table */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#1976D2" }}>
                  {[
                    "#",
                    "Bill No",
                    "Project",
                    "Contractor",
                    "Net Amount",
                    "Paid",
                    "Remaining",
                    "Payment Status",
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
                      colSpan={9}
                      className="px-4 py-12 text-center"
                      data-ocid="paygo.payments.empty_state"
                    >
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <CreditCard size={32} className="opacity-40" />
                        <span className="text-sm">
                          {approvedBills.length === 0
                            ? "No bills have been approved by Billing Engineer yet."
                            : "No bills match the current filters."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => (
                    <tr
                      key={b.id}
                      style={{ background: i % 2 === 0 ? "#E3F2FD" : "#fff" }}
                      data-ocid={`paygo.payments.item.${i + 1}`}
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
                      <td
                        className="px-3 py-2.5 font-semibold whitespace-nowrap"
                        style={{ color: GREEN }}
                      >
                        {formatINR(b.netAmount || b.amount)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                        {formatINR(b.paidAmount || 0)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-red-600 whitespace-nowrap">
                        {formatINR(b.remainingAmount || 0)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={
                            PAYMENT_STATUS_COLORS[b.paymentStatus || "Unpaid"]
                          }
                        >
                          {b.paymentStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {(b.paymentStatus || "Unpaid") !== "Completed" &&
                          canPayOrEdit && (
                            <button
                              type="button"
                              onClick={() => setPayingBill(b)}
                              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-white shadow-sm hover:opacity-90 transition-opacity"
                              style={{ background: GREEN }}
                              data-ocid={"paygo.payments.primary_button"}
                            >
                              <CreditCard size={12} /> Pay
                            </button>
                          )}
                        {(b.paymentStatus || "Unpaid") === "Completed" && (
                          <span className="text-xs text-green-600 font-semibold">
                            ✔ Paid
                          </span>
                        )}
                        {(b.paymentStatus || "Unpaid") !== "Completed" &&
                          !canPayOrEdit && (
                            <span className="text-xs text-gray-400 italic">
                              View only
                            </span>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pay Dialog */}
      {payingBill && (
        <PayBillDialog
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onPay={payBill}
        />
      )}
    </div>
  );
}

// ─── Payments Tab (existing) ──────────────────────────────────────────────────
function PaymentsTab({ currentRole }: { currentRole: Role }) {
  const { projects, payments, addPayment, updatePayment, deletePayment } =
    usePayGo();
  const canPayOrEdit =
    currentRole === "Admin" || currentRole === "Billing Engineer";
  const isAdmin = currentRole === "Admin";
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoPayment | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    project: "",
    mode: "",
    status: "",
  });

  const filtered = payments.filter((p) => {
    if (filters.project && p.project !== filters.project) return false;
    if (filters.mode && p.paymentMode !== filters.mode) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };
  const openEdit = (p: PayGoPayment) => {
    setEditItem(p);
    setForm({
      project: p.project,
      date: p.date,
      amount: p.amount,
      paymentMode: p.paymentMode,
      reference: p.reference,
      remarks: p.remarks,
      status: p.status,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.project || form.amount <= 0) {
      toast.error("Project and Amount are required.");
      return;
    }
    if (editItem) {
      updatePayment({ ...editItem, ...form });
      toast.success("Payment updated.");
    } else {
      addPayment(form);
      toast.success("Payment added.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deletePayment(deleteId);
    toast.success("Payment deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportCSV = () => {
    const h = [
      "Payment No",
      "Project",
      "Date",
      "Amount",
      "Mode",
      "Reference",
      "Status",
      "Remarks",
    ];
    const rows = filtered.map((p) => [
      p.paymentNo,
      p.project,
      p.date,
      p.amount,
      p.paymentMode,
      p.reference,
      p.status,
      p.remarks,
    ]);
    const csv = [h, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-payments.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors"
          >
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors"
          >
            <FileText size={14} /> Export PDF
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="flex items-center gap-3">
          {canPayOrEdit && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-sm font-semibold shadow-md hover:opacity-90"
              style={{ background: GREEN }}
              data-ocid="paygo.payments.primary_button"
            >
              <Plus size={16} /> New Payment
            </button>
          )}
          <div
            className="rounded-xl px-4 py-2 text-white text-sm font-bold shadow-md flex flex-col items-end"
            style={{ background: "linear-gradient(135deg, #43A047, #1B5E20)" }}
          >
            <span className="text-xs font-normal opacity-90">
              Total Payments
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

      {/* Filters */}
      <div className="px-4 pt-3 pb-1">
        <div
          className="rounded-xl shadow-sm border flex flex-wrap gap-4 px-4 py-3"
          style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">
              Project:
            </span>
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters((f) => ({ ...f, project: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {projectNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Mode:</span>
            <select
              value={filters.mode}
              onChange={(e) =>
                setFilters((f) => ({ ...f, mode: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="Account">Account</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Status:</span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          {(filters.project || filters.mode || filters.status) && (
            <button
              type="button"
              onClick={() => setFilters({ project: "", mode: "", status: "" })}
              className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-4 py-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: GREEN }}>
                  {[
                    "#",
                    "Payment No",
                    "Project",
                    "Date",
                    "Amount (₹)",
                    "Mode",
                    "Reference",
                    "Status",
                    "Remarks",
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
                      colSpan={10}
                      className="px-4 py-10 text-center text-gray-400 text-sm"
                      data-ocid="paygo.payments.empty_state"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ background: i % 2 === 0 ? "#E8F5E9" : "#fff" }}
                      data-ocid={`paygo.payments.item.${i + 1}`}
                    >
                      <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">
                        {p.paymentNo}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{p.project}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(p.date)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                        {formatINR(p.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.paymentMode === "Account" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {p.paymentMode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[100px] truncate">
                        {p.reference || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "Completed" ? "bg-green-100 text-green-700" : p.status === "Partial" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate">
                        {p.remarks || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {canPayOrEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              title="Edit"
                              className="text-gray-500 hover:text-gray-700"
                              data-ocid={`paygo.payments.edit_button.${i + 1}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteId(p.id);
                                setPw("");
                              }}
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                              data-ocid={`paygo.payments.delete_button.${i + 1}`}
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

      {/* Form Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) setFormOpen(false);
        }}
      >
        <DialogContent data-ocid="paygo.payments.dialog">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Payment" : "New Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Project</Label>
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
              <Label className="text-xs font-semibold">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Amount (₹)</Label>
              <Input
                type="number"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select
                value={form.paymentMode}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    paymentMode: v as "Account" | "Cash",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Account">Account</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference: e.target.value }))
                }
                placeholder="NEFT/ref..."
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as PayGoPayment["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              data-ocid="paygo.payments.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ background: GREEN, color: "#fff" }}
              data-ocid="paygo.payments.submit_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent data-ocid="paygo.payments.dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this payment.
          </p>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="paygo.payments.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              data-ocid="paygo.payments.delete_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────
type ActivePayTab = "bills" | "payments";

export default function PayGoPaymentsPage() {
  const [activeTab, setActiveTab] = useState<ActivePayTab>("bills");
  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const { bills } = usePayGo();

  const pendingBillsCount = useMemo(
    () =>
      bills.filter(
        (b) =>
          b.workflowStatus === "Billing Approved" &&
          (b.paymentStatus || "Unpaid") !== "Completed",
      ).length,
    [bills],
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Role Switcher + tab header */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-md px-3 py-1.5">
          <User size={13} className="text-purple-600" />
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as Role)}
            className="text-xs font-semibold text-purple-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-0 ml-2">
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className="px-5 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2"
            style={{
              borderColor: activeTab === "bills" ? "#1976D2" : "transparent",
              color: activeTab === "bills" ? "#1976D2" : "#6B7280",
            }}
            data-ocid="paygo.payments.bills.tab"
          >
            <CreditCard size={14} />
            Bill Payments
            {pendingBillsCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingBillsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className="px-5 py-2 text-sm font-semibold border-b-2 transition-colors"
            style={{
              borderColor: activeTab === "payments" ? GREEN : "transparent",
              color: activeTab === "payments" ? GREEN : "#6B7280",
            }}
            data-ocid="paygo.payments.general.tab"
          >
            General Payments
          </button>
        </div>
      </div>

      {activeTab === "bills" ? (
        <BillsPaymentTab currentRole={currentRole} />
      ) : (
        <PaymentsTab currentRole={currentRole} />
      )}
    </div>
  );
}
