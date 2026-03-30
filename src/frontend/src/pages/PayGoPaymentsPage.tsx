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
import { Download, Edit2, Printer, Trash2 } from "lucide-react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type PayGoPayment, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";

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

export default function PayGoPaymentsPage() {
  const { projects, payments, addPayment, updatePayment, deletePayment } =
    usePayGo();
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
    const headers = [
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
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-payments.csv";
    a.click();
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `<html><head><title>PayGo Payments</title><style>body{font-family:Century Gothic,sans-serif;font-size:12px;margin:20px;}table{width:100%;border-collapse:collapse;}th{background:#28A745;color:#fff;padding:6px 8px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #ddd;}.total{font-weight:bold;text-align:right;padding:8px;}</style></head><body><h2 style="color:#28A745">PayGo – Payments Report</h2><p>Total: ${formatINR(totalAmount)}</p><table><thead><tr>${["Payment No", "Project", "Date", "Amount", "Mode", "Status"].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${filtered.map((p) => `<tr><td>${p.paymentNo}</td><td>${p.project}</td><td>${p.date.split("-").reverse().join("-")}</td><td>${formatINR(p.amount)}</td><td>${p.paymentMode}</td><td>${p.status}</td></tr>`).join("")}</tbody></table></body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const fmtDate = (d: string) => (d ? d.split("-").reverse().join("-") : "");

  return (
    <div className="p-6">
      {/* Toolbar + Summary */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={openAdd}
            size="sm"
            style={{ background: GREEN, color: "#fff" }}
            data-ocid="paygo.payments.primary_button"
          >
            <Plus className="h-4 w-4 mr-1" /> New Payment
          </Button>
          <Button
            onClick={exportCSV}
            size="sm"
            variant="outline"
            data-ocid="paygo.payments.secondary_button"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={handlePrint} size="sm" variant="outline">
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
        <div className="bg-green-50 border-2 border-green-300 rounded-lg px-5 py-3 text-right">
          <div className="text-xs text-green-700 font-semibold uppercase">
            Total Payments
          </div>
          <div className="text-xl font-bold" style={{ color: GREEN }}>
            {formatINR(totalAmount)}
          </div>
          <div className="text-xs text-gray-500">{filtered.length} records</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Project:</span>
          <Select
            value={filters.project || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, project: v === "all" ? "" : v }))
            }
          >
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Mode:</span>
          <Select
            value={filters.mode || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, mode: v === "all" ? "" : v }))
            }
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Account">Account</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Status:</span>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))
            }
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => setFilters({ project: "", mode: "", status: "" })}
          data-ocid="paygo.payments.secondary_button"
        >
          Clear
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: GREEN }}>
              {[
                "#",
                "Payment No",
                "Project",
                "Date",
                "Amount",
                "Mode",
                "Reference",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide"
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
                  className="px-4 py-8 text-center text-gray-400"
                  data-ocid="paygo.payments.empty_state"
                >
                  No payments found.
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                  data-ocid={`paygo.payments.item.${i + 1}`}
                >
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td
                    className="px-4 py-2 font-medium"
                    style={{ color: GREEN }}
                  >
                    {p.paymentNo}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{p.project}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(p.date)}</td>
                  <td className="px-4 py-2 font-semibold">
                    {formatINR(p.amount)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.paymentMode}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {p.reference}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          p.status === "Completed"
                            ? "#d4edda"
                            : p.status === "Pending"
                              ? "#fff3cd"
                              : "#cce5ff",
                        color:
                          p.status === "Completed"
                            ? "#155724"
                            : p.status === "Pending"
                              ? "#856404"
                              : "#004085",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        title="Edit"
                        data-ocid={`paygo.payments.edit_button.${i + 1}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(p.id);
                          setPw("");
                        }}
                        title="Delete"
                        data-ocid={`paygo.payments.delete_button.${i + 1}`}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" data-ocid="paygo.payments.modal">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Payment" : "New Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Project *</Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm((f) => ({ ...f, project: v }))}
              >
                <SelectTrigger data-ocid="paygo.payments.select">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
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
                data-ocid="paygo.payments.input"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
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
                    paymentMode: v as PayGoPayment["paymentMode"],
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
              <Label className="text-xs font-semibold">Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference: e.target.value }))
                }
                placeholder="NEFT / Cheque No"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                rows={2}
                data-ocid="paygo.payments.textarea"
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
