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
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  Edit2,
  FileText,
  Plus,
  Printer,
  Share2,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type PayGoBill,
  type PayGoPayment,
  usePayGo,
} from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";
const MPH_ADDRESS = [
  "MPH Developers",
  "Plot No. 164A & 164B, Isnapur,",
  "Patancheru, Sangareddy,",
  "Hyderabad - 502307",
  "info@mphdevelopers.com",
  "www.mphdevelopers.com",
];

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

// ─── Payment Receipt Component ─────────────────────────────────────────────────
function PaymentReceipt({ bill }: { bill: PayGoBill }) {
  const netAmt = bill.netAmount || bill.amount || 0;
  const entries = bill.paymentEntries || [];
  const totalPaid = entries.reduce((s, e) => s + e.amount, 0);
  const outstanding = Math.max(0, netAmt - totalPaid);
  const today = fmtDate(new Date().toISOString().split("T")[0]);
  const isFullyPaid = outstanding <= 0;

  return (
    <div
      className="relative bg-white rounded p-0"
      style={{
        fontFamily: "'Century Gothic', Arial, sans-serif",
        minWidth: 560,
      }}
    >
      {/* Watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <img
          src="/assets/logo mkt.png"
          alt=""
          style={{
            opacity: 0.07,
            width: 280,
            height: 280,
            objectFit: "contain",
          }}
        />
      </div>

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xl font-bold" style={{ color: GREEN }}>
              Payment Receipt
            </div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold" style={{ color: GREEN }}>
              {bill.billNo}
            </div>
            <div className="text-xs text-gray-500">Bill No.</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Date</div>
            <div className="text-sm font-semibold text-gray-700">{today}</div>
          </div>
        </div>

        {/* Company / Contractor box */}
        <div
          className="grid grid-cols-2 border rounded-lg overflow-hidden mb-3"
          style={{ borderColor: "#e5e7eb" }}
        >
          <div
            className="p-3 border-r"
            style={{ borderColor: "#e5e7eb", background: "#F0FFF4" }}
          >
            <div className="font-bold text-sm mb-1.5" style={{ color: GREEN }}>
              {MPH_ADDRESS[0]}
            </div>
            {MPH_ADDRESS.slice(1).map((line) => (
              <div key={line} className="text-xs text-gray-600 leading-relaxed">
                {line}
              </div>
            ))}
          </div>
          <div className="p-3" style={{ background: "#F8F9FF" }}>
            <div className="font-bold text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
              TO
            </div>
            <div className="text-sm font-bold text-gray-800">
              {bill.contractor}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Trade:</span> {bill.trade || "—"}
            </div>
            {bill.subTrade && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Sub Trade:</span> {bill.subTrade}
              </div>
            )}
            <div className="text-xs text-gray-600">
              <span className="font-medium">W.O No:</span> {bill.blockId || "—"}
            </div>
          </div>
        </div>

        {/* Project / Block */}
        <div className="flex gap-6 mb-3 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Project: </span>
            <span className="text-gray-800 font-bold">{bill.project}</span>
          </div>
          {bill.blockId && (
            <div>
              <span className="font-semibold text-gray-600">Block: </span>
              <span className="text-gray-800">{bill.blockId}</span>
            </div>
          )}
        </div>

        {/* Payment Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: "#1B5E20" }}>
              <th className="px-3 py-2 text-left text-white font-semibold text-xs whitespace-nowrap w-12">
                SI No
              </th>
              <th className="px-3 py-2 text-left text-white font-semibold text-xs w-28">
                Date
              </th>
              <th className="px-3 py-2 text-left text-white font-semibold text-xs">
                Details Of Payment
              </th>
              <th className="px-3 py-2 text-right text-white font-semibold text-xs whitespace-nowrap w-36">
                Amount ₹
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Net Amount */}
            <tr style={{ background: "#F0FFF4" }}>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">1</td>
              <td className="px-3 py-2 text-xs text-gray-400">—</td>
              <td
                className="px-3 py-2 font-bold text-sm"
                style={{ color: GREEN }}
              >
                Net Amount
              </td>
              <td
                className="px-3 py-2 text-right font-bold text-sm"
                style={{ color: GREEN }}
              >
                {formatINR(netAmt)}
              </td>
            </tr>

            {/* Payment entries */}
            {entries.map((entry, idx) => (
              <tr
                key={entry.id}
                style={{ background: idx % 2 === 0 ? "#EBF5FF" : "#fff" }}
              >
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                  {idx + 2}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {fmtDate(entry.date)}
                </td>
                <td
                  className="px-3 py-2 font-semibold text-sm"
                  style={{ color: "#1565C0" }}
                >
                  Payment {idx + 1}
                  {entry.paymentMode && (
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({entry.paymentMode})
                    </span>
                  )}
                  {entry.reference && (
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      Ref: {entry.reference}
                    </span>
                  )}
                </td>
                <td
                  className="px-3 py-2 text-right font-semibold text-sm"
                  style={{ color: "#1565C0" }}
                >
                  {formatINR(entry.amount)}
                </td>
              </tr>
            ))}

            {/* Outstanding row */}
            <tr style={{ background: isFullyPaid ? "#F0FFF4" : "#FFF5F5" }}>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                {entries.length + 2}
              </td>
              <td className="px-3 py-2 text-xs text-gray-400">—</td>
              <td
                className="px-3 py-2 font-bold text-sm"
                style={{ color: isFullyPaid ? GREEN : "#D32F2F" }}
              >
                Outstanding
              </td>
              <td
                className="px-3 py-2 text-right font-bold text-sm"
                style={{ color: isFullyPaid ? GREEN : "#D32F2F" }}
              >
                {formatINR(outstanding)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Summary strip */}
        <div className="mt-3 flex justify-between items-center text-xs text-gray-500 border-t pt-2">
          <span>
            Total Paid:{" "}
            <span className="font-semibold" style={{ color: GREEN }}>
              {formatINR(totalPaid)}
            </span>
          </span>
          <span>
            Status:{" "}
            <span
              className="font-semibold"
              style={{
                color:
                  bill.paymentStatus === "Completed"
                    ? GREEN
                    : bill.paymentStatus === "Partially Paid"
                      ? "#1565C0"
                      : "#D32F2F",
              }}
            >
              {bill.paymentStatus || "Unpaid"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── View Receipt Modal ──────────────────────────────────────────────────────
function ViewReceiptModal({
  bill,
  onClose,
}: {
  bill: PayGoBill;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payment Receipt - ${bill.billNo}</title>
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Century Gothic', Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 11px; }
        th { background: #1B5E20 !important; color: white !important; -webkit-print-color-adjust: exact; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: 0.07; width: 250px; pointer-events: none; }
      </style></head><body>
      <img class="watermark" src="/assets/logo mkt.png" />
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleShare = useCallback(() => {
    try {
      // Use print-to-PDF as a reliable cross-browser share/save approach
      const content = receiptRef.current;
      if (!content) return;
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        toast.error("Could not open print window. Check popup blocker.");
        return;
      }
      printWindow.document.write(`
        <html><head><title>Payment Receipt - ${bill.billNo}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Century Gothic', Arial, sans-serif; margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 11px; }
          th { background: #1B5E20 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: 0.07; width: 250px; pointer-events: none; z-index: -1; }
          @media print { .no-print { display: none; } }
        </style></head><body>
        <img class="watermark" src="/assets/logo mkt.png" />
        ${content.innerHTML}
        <script>window.onload = function() { window.print(); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
      toast.success("Receipt opened — save as PDF from the print dialog.");
    } catch {
      toast.error("Could not share receipt.");
    }
  }, [bill.billNo]);

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="paygo.payments.receipt.modal"
      >
        {/* Modal header toolbar */}
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <h3 className="text-sm font-bold text-gray-600">
            Payment Receipt —{" "}
            <span style={{ color: GREEN }}>{bill.billNo}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Print"
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
              data-ocid="paygo.payments.receipt.print"
            >
              <Printer size={13} /> Print
            </button>
            <button
              type="button"
              onClick={handleShare}
              title="Share as Image"
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-300 rounded hover:bg-blue-50 text-blue-600 transition-colors"
              data-ocid="paygo.payments.receipt.share"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
              data-ocid="paygo.payments.receipt.close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Receipt content */}
        <div ref={receiptRef} className="bg-white p-4">
          <PaymentReceipt bill={bill} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pay Bill Dialog ──────────────────────────────────────────────────────────
type PayBillDialogProps = {
  bill: PayGoBill;
  onClose: () => void;
  onPay: (billId: string, amount: number, mode?: string, ref?: string) => void;
};

function PayBillDialog({ bill, onClose, onPay }: PayBillDialogProps) {
  const [payAmt, setPayAmt] = useState<number>(bill.remainingAmount || 0);
  const [payMode, setPayMode] = useState("Account");
  const [payRef, setPayRef] = useState("");

  const handlePay = () => {
    if (payAmt <= 0) {
      toast.error("Payment amount must be greater than 0.");
      return;
    }
    if (payAmt > (bill.remainingAmount || 0)) {
      toast.error(
        `Cannot exceed outstanding: ${formatINR(bill.remainingAmount || 0)}`,
      );
      return;
    }
    onPay(bill.id, payAmt, payMode, payRef);
    toast.success(
      payAmt >= (bill.remainingAmount || 0)
        ? "Full payment processed. Bill marked as Completed."
        : `Partial payment of ${formatINR(payAmt)} recorded.`,
    );
    onClose();
  };

  const willBeComplete = payAmt >= (bill.remainingAmount || 0) && payAmt > 0;
  const willBePartial = payAmt < (bill.remainingAmount || 0) && payAmt > 0;
  const netAmt = bill.netAmount || bill.amount || 0;

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
                {formatINR(netAmt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Already Paid:</span>
              <span className="font-medium text-gray-700">
                {formatINR(bill.paidAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-semibold">Outstanding:</span>
              <span className="font-bold text-red-600">
                {formatINR(bill.remainingAmount || 0)}
              </span>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="Account">Account / NEFT</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Reference No.</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="NEFT/UTR/Ref..."
                className="mt-1"
              />
            </div>
          </div>

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

// ─── Bills Payment Tab ────────────────────────────────────────────────────────
type SortKey =
  | "billNo"
  | "project"
  | "contractor"
  | "netAmount"
  | "paidAmount"
  | "remainingAmount"
  | "paymentStatus";
type SortDir = "asc" | "desc";

function BillsPaymentTab({ currentRole }: { currentRole: Role }) {
  const { bills, payBill } = usePayGo();
  const canPayOrEdit =
    currentRole === "Admin" || currentRole === "Billing Engineer";
  const isAdminOrBE =
    currentRole === "Admin" || currentRole === "Billing Engineer";
  const [payingBill, setPayingBill] = useState<PayGoBill | null>(null);
  const [viewBill, setViewBill] = useState<PayGoBill | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "all" | PayGoBill["paymentStatus"]
  >("all");
  const [filterProject, setFilterProject] = useState("");
  const [filterContractor, setFilterContractor] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("billNo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const filtered = useMemo(() => {
    let result = approvedBills.filter((b) => {
      const mStatus =
        filterStatus === "all" ||
        (b.paymentStatus || "Unpaid") === filterStatus;
      const mProject = !filterProject || b.project === filterProject;
      const mContractor =
        !filterContractor || b.contractor === filterContractor;
      return mStatus && mProject && mContractor;
    });

    result = [...result].sort((a, b) => {
      let av: string | number = a[sortKey] ?? "";
      let bv: string | number = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [
    approvedBills,
    filterStatus,
    filterProject,
    filterContractor,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const totalNet = filtered.reduce(
    (s, b) => s + (b.netAmount || b.amount || 0),
    0,
  );
  const totalPaid = filtered.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalRemaining = filtered.reduce(
    (s, b) => s + (b.remainingAmount || 0),
    0,
  );

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp size={11} className="inline ml-0.5" />
      ) : (
        <ChevronDown size={11} className="inline ml-0.5" />
      )
    ) : (
      <ArrowUpDown size={10} className="inline ml-0.5 opacity-40" />
    );

  const clearFilters = () => {
    setFilterProject("");
    setFilterContractor("");
    setFilterStatus("all");
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Summary cards */}
      <div className="px-4 py-3 flex gap-3 flex-wrap">
        {[
          {
            label: "Total Net Bills",
            value: totalNet,
            sub: `${filtered.length} bills`,
            grad: "linear-gradient(135deg,#1976D2,#0D47A1)",
          },
          {
            label: "Total Paid",
            value: totalPaid,
            sub: "",
            grad: "linear-gradient(135deg,#43A047,#1B5E20)",
          },
          {
            label: "Total Outstanding",
            value: totalRemaining,
            sub: "",
            grad: "linear-gradient(135deg,#E53935,#B71C1C)",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl px-4 py-3 text-white font-bold shadow-md flex flex-col"
            style={{ background: c.grad }}
          >
            <span className="text-xs font-normal opacity-90">{c.label}</span>
            <span className="text-lg">{formatINR(c.value)}</span>
            {c.sub && <span className="text-xs opacity-75">{c.sub}</span>}
          </div>
        ))}
      </div>

      {/* Filter toggle bar */}
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
            onClick={clearFilters}
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
              {[
                {
                  label: "Project",
                  value: filterProject,
                  set: setFilterProject,
                  opts: projectNames,
                  placeholder: "All Projects",
                },
                {
                  label: "Contractor",
                  value: filterContractor,
                  set: setFilterContractor,
                  opts: contractorNames,
                  placeholder: "All Contractors",
                },
              ].map((f) => (
                <div key={f.label}>
                  <span className="block text-xs font-semibold text-gray-600 mb-1">
                    {f.label}
                  </span>
                  <select
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    <option value="">{f.placeholder}</option>
                    {f.opts.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
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
                onClick={clearFilters}
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
                  {(
                    [
                      ["#", null],
                      ["Bill No", "billNo"],
                      ["Project", "project"],
                      ["Contractor", "contractor"],
                      ["Net Amount", "netAmount"],
                      ["Paid", "paidAmount"],
                      ["Outstanding", "remainingAmount"],
                      ["Payment Status", "paymentStatus"],
                      ["Actions", null],
                    ] as [string, SortKey | null][]
                  ).map(([h, k]) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                      style={{ cursor: k ? "pointer" : "default" }}
                      onClick={() => k && toggleSort(k)}
                      onKeyDown={(e) => e.key === "Enter" && k && toggleSort(k)}
                    >
                      {h}
                      {k && <SortIcon k={k} />}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* View Receipt button */}
                          <button
                            type="button"
                            onClick={() => setViewBill(b)}
                            title="View Receipt"
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                            data-ocid={`paygo.payments.view_button.${i + 1}`}
                          >
                            <FileText size={11} /> View
                          </button>

                          {/* Print (Admin + BE only) */}
                          {isAdminOrBE && (
                            <button
                              type="button"
                              onClick={() => setViewBill(b)}
                              title="Print Receipt"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                              data-ocid={`paygo.payments.print_button.${i + 1}`}
                            >
                              <Printer size={11} /> Print
                            </button>
                          )}

                          {/* Pay button */}
                          {(b.paymentStatus || "Unpaid") !== "Completed" &&
                            canPayOrEdit && (
                              <button
                                type="button"
                                onClick={() => setPayingBill(b)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded text-white shadow-sm hover:opacity-90 transition-opacity"
                                style={{ background: GREEN }}
                                data-ocid={`paygo.payments.primary_button.${i + 1}`}
                              >
                                <CreditCard size={11} /> Pay
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

      {/* Pay Dialog */}
      {payingBill && (
        <PayBillDialog
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onPay={(id, amount, mode, ref) => payBill(id, amount, mode, ref)}
        />
      )}

      {/* View Receipt Modal */}
      {viewBill && (
        <ViewReceiptModal bill={viewBill} onClose={() => setViewBill(null)} />
      )}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
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
  const [showFilters, setShowFilters] = useState(false);
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
  const clearFilters = () => setFilters({ project: "", mode: "", status: "" });

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
        {(filters.project || filters.mode || filters.status) && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-xs font-medium text-red-500 hover:text-red-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 pt-2 pb-3">
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
              <span className="text-xs font-semibold text-gray-600">
                Status:
              </span>
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
                onClick={clearFilters}
                className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 self-end"
              >
                Clear
              </button>
            )}
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

// ─── Main Export ──────────────────────────────────────────────────────────────
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
      {/* Role Switcher + Tabs */}
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
