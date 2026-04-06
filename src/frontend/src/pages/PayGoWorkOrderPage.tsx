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
  Copy,
  Download,
  Edit2,
  Eye,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type PayGoWorkOrder,
  type WorkOrderItem,
  usePayGo,
} from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";

const STATUS_COLORS: Record<
  PayGoWorkOrder["status"],
  { bg: string; color: string }
> = {
  Draft: { bg: "#E2E3E5", color: "#383D41" },
  Issued: { bg: "#CCE5FF", color: "#004085" },
  "In Progress": { bg: "#FFF3CD", color: "#856404" },
  Completed: { bg: "#D4EDDA", color: "#155724" },
};

function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

type WOFormData = Omit<PayGoWorkOrder, "id" | "workOrderNo" | "version">;

const emptyForm = (): WOFormData => ({
  project: "",
  contractor: "",
  boqId: "",
  scopeOfWork: "",
  workOrderDate: new Date().toISOString().split("T")[0],
  startDate: "",
  endDate: "",
  paymentTerms:
    "Monthly billing based on actual work done. Payment within 30 days of approved bill.",
  retentionPct: 5,
  specialConditions: "",
  items: [],
  totalAmount: 0,
  status: "Draft",
  notes: "",
});

export default function PayGoWorkOrderPage() {
  const {
    projects,
    contractors,
    boqs,
    workOrders,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    duplicateWorkOrder,
  } = usePayGo();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoWorkOrder | null>(null);
  const [form, setForm] = useState<WOFormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [viewItem, setViewItem] = useState<PayGoWorkOrder | null>(null);
  const [formStep, setFormStep] = useState<"details" | "items">("details");

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );

  const contractorNames = useMemo(
    () => [
      ...new Set(
        contractors
          .filter((c) => !form.project || c.project === form.project)
          .map((c) => c.name),
      ),
    ],
    [contractors, form.project],
  );

  const projectBOQs = useMemo(
    () => boqs.filter((b) => b.projectName === form.project),
    [boqs, form.project],
  );

  const selectedBOQ = useMemo(
    () => boqs.find((b) => b.id === form.boqId) || null,
    [boqs, form.boqId],
  );

  const allBOQItems = useMemo(() => {
    if (!selectedBOQ) return [];
    const items: {
      catName: string;
      subName: string;
      item: {
        id: string;
        description: string;
        unit: string;
        qty: number;
        rate: number;
      };
    }[] = [];
    for (const cat of selectedBOQ.categories) {
      for (const sub of cat.subCategories) {
        for (const item of sub.items) {
          const qty = item.isManualQty
            ? item.qty
            : item.length * item.width * item.height || 0;
          items.push({
            catName: cat.name,
            subName: sub.name,
            item: {
              id: item.id,
              description: item.description,
              unit: item.unit,
              qty,
              rate: item.rate,
            },
          });
        }
      }
    }
    return items;
  }, [selectedBOQ]);

  const totalWOAmount = useMemo(
    () => form.items.reduce((s, i) => s + i.amount, 0),
    [form.items],
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormStep("details");
    setFormOpen(true);
  };

  const openEdit = (wo: PayGoWorkOrder) => {
    setEditItem(wo);
    setForm({
      project: wo.project,
      contractor: wo.contractor,
      boqId: wo.boqId,
      scopeOfWork: wo.scopeOfWork,
      workOrderDate: wo.workOrderDate,
      startDate: wo.startDate,
      endDate: wo.endDate,
      paymentTerms: wo.paymentTerms,
      retentionPct: wo.retentionPct,
      specialConditions: wo.specialConditions,
      items: wo.items,
      totalAmount: wo.totalAmount,
      status: wo.status,
      notes: wo.notes,
    });
    setFormStep("details");
    setFormOpen(true);
  };

  const toggleBOQItem = (
    boqItemId: string,
    description: string,
    unit: string,
    qty: number,
    rate: number,
  ) => {
    setForm((f) => {
      const existing = f.items.find((i) => i.boqItemId === boqItemId);
      if (existing) {
        // Remove
        const items = f.items.filter((i) => i.boqItemId !== boqItemId);
        return {
          ...f,
          items,
          totalAmount: items.reduce((s, i) => s + i.amount, 0),
        };
      }
      // Add
      const newItem: WorkOrderItem = {
        boqItemId,
        description,
        unit,
        qty,
        rate,
        amount: qty * rate,
      };
      const items = [...f.items, newItem];
      return {
        ...f,
        items,
        totalAmount: items.reduce((s, i) => s + i.amount, 0),
      };
    });
  };

  const updateWOItemQty = (boqItemId: string, qty: number) => {
    setForm((f) => {
      const items = f.items.map((i) =>
        i.boqItemId === boqItemId ? { ...i, qty, amount: qty * i.rate } : i,
      );
      return {
        ...f,
        items,
        totalAmount: items.reduce((s, i) => s + i.amount, 0),
      };
    });
  };

  const handleSave = (status: PayGoWorkOrder["status"]) => {
    if (!form.project || !form.contractor) {
      toast.error("Project and Contractor are required.");
      return;
    }
    const finalForm = { ...form, status, totalAmount: totalWOAmount };
    if (editItem) {
      updateWorkOrder({ ...editItem, ...finalForm });
      toast.success("Work Order updated.");
    } else {
      addWorkOrder(finalForm);
      toast.success(
        `Work Order ${status === "Draft" ? "saved as draft" : "issued"}.`,
      );
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteWorkOrder(deleteId);
    toast.success("Work Order deleted.");
    setDeleteId(null);
    setPw("");
  };

  const handleDuplicate = (id: string) => {
    duplicateWorkOrder(id);
    toast.success("Work Order duplicated.");
  };

  const updateStatus = (
    wo: PayGoWorkOrder,
    status: PayGoWorkOrder["status"],
  ) => {
    updateWorkOrder({ ...wo, status });
    toast.success("Status updated.");
  };

  const exportCSV = () => {
    const h = [
      "WO No",
      "Project",
      "Contractor",
      "Date",
      "Total Value",
      "Status",
      "Version",
    ];
    const rows = workOrders.map((w) => [
      w.workOrderNo,
      w.project,
      w.contractor,
      w.workOrderDate,
      w.totalAmount,
      w.status,
      w.version,
    ]);
    const csv = [h, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-work-orders.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer";

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ fontFamily: "'Century Gothic', Arial, sans-serif" }}
    >
      {/* Page header */}
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <h1 className="text-lg font-bold" style={{ color: GREEN }}>
          Work Orders
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage and issue work orders to contractors based on approved BOQs
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className={toolbarBtnClass}
          >
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={exportCSV} className={toolbarBtnClass}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-sm font-semibold shadow-md hover:opacity-90"
          style={{ background: GREEN }}
          data-ocid="paygo.workorder.primary_button"
        >
          <Plus size={16} /> New Work Order
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-2">
        <span className="text-xs text-gray-500">
          <strong>{workOrders.length}</strong> work orders &mdash;&nbsp;
          <strong>
            {
              workOrders.filter(
                (w) => w.status === "Issued" || w.status === "In Progress",
              ).length
            }
          </strong>{" "}
          active
        </span>
      </div>

      {/* Table */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: GREEN }}>
                  {[
                    "#",
                    "WO No",
                    "Project",
                    "Contractor",
                    "Date",
                    "Total Value",
                    "Status",
                    "Ver.",
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
                {workOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-400 text-sm"
                      data-ocid="paygo.workorder.empty_state"
                    >
                      No work orders yet. Click &quot;+ New Work Order&quot; to
                      create one.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo, i) => (
                    <tr
                      key={wo.id}
                      style={{ background: i % 2 === 0 ? "#F0FFF4" : "#fff" }}
                      data-ocid={`paygo.workorder.item.${i + 1}`}
                    >
                      <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">
                        {wo.workOrderNo}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[100px] truncate">
                        {wo.project}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {wo.contractor}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(wo.workOrderDate)}
                      </td>
                      <td
                        className="px-3 py-2.5 font-semibold whitespace-nowrap"
                        style={{ color: GREEN }}
                      >
                        {formatINR(wo.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={wo.status}
                          onChange={(e) =>
                            updateStatus(
                              wo,
                              e.target.value as PayGoWorkOrder["status"],
                            )
                          }
                          className="text-xs rounded border-0 outline-none cursor-pointer px-1 py-0.5 font-semibold"
                          style={STATUS_COLORS[wo.status]}
                        >
                          {(
                            [
                              "Draft",
                              "Issued",
                              "In Progress",
                              "Completed",
                            ] as const
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        v{wo.version}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewItem(wo)}
                            title="View"
                            className="text-blue-500 hover:text-blue-700"
                            data-ocid={`paygo.workorder.edit_button.${i + 1}`}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(wo)}
                            title="Edit"
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(wo.id)}
                            title="Duplicate"
                            className="text-purple-500 hover:text-purple-700"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteId(wo.id);
                              setPw("");
                            }}
                            title="Delete"
                            className="text-red-500 hover:text-red-700"
                            data-ocid={`paygo.workorder.delete_button.${i + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* View Work Order */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            style={{ border: "3px solid #28A745" }}
            data-ocid="paygo.workorder.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Work Order: {viewItem.workOrderNo}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded hover:bg-gray-100"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewItem(null)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-500"
                  data-ocid="paygo.workorder.close_button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Company header */}
            <div className="text-center py-3 border-b">
              <div className="text-base font-bold text-gray-800">
                MPH Construction
              </div>
              <div className="text-sm text-gray-500">Work Order Document</div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
              {(
                [
                  ["WO No", viewItem.workOrderNo],
                  ["Version", `v${viewItem.version}`],
                  ["Project", viewItem.project],
                  ["Contractor", viewItem.contractor],
                  ["WO Date", fmtDate(viewItem.workOrderDate)],
                  ["Start Date", fmtDate(viewItem.startDate)],
                  ["End Date", fmtDate(viewItem.endDate)],
                  ["Retention %", `${viewItem.retentionPct}%`],
                  ["Status", viewItem.status],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    {k}:
                  </span>
                  <span className="text-gray-800 font-semibold text-xs">
                    {v || "—"}
                  </span>
                </div>
              ))}
            </div>

            {viewItem.scopeOfWork && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-gray-600">
                  Scope of Work:
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {viewItem.scopeOfWork}
                </p>
              </div>
            )}

            {/* Items table */}
            {viewItem.items.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-bold text-gray-600 mb-2 uppercase">
                  Item-wise Breakdown
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: GREEN }}>
                      {[
                        "#",
                        "Description",
                        "Unit",
                        "Qty",
                        "Rate",
                        "Amount",
                      ].map((h) => (
                        <th
                          key={h}
                          className="border border-green-700 px-2 py-1.5 text-left text-white font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewItem.items.map((item, idx) => (
                      <tr
                        key={item.boqItemId}
                        style={{
                          background: idx % 2 === 0 ? "#F9FFF9" : "#fff",
                        }}
                      >
                        <td className="border border-gray-200 px-2 py-1.5 text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                          {item.description}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-600">
                          {item.unit}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-center">
                          {item.qty}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-right">
                          {formatINR(item.rate)}
                        </td>
                        <td
                          className="border border-gray-200 px-2 py-1.5 text-right font-semibold"
                          style={{ color: GREEN }}
                        >
                          {formatINR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewItem.paymentTerms && (
              <div className="mt-3">
                <span className="text-xs font-semibold text-gray-600">
                  Payment Terms:
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {viewItem.paymentTerms}
                </p>
              </div>
            )}
            {viewItem.specialConditions && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-gray-600">
                  Special Conditions:
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {viewItem.specialConditions}
                </p>
              </div>
            )}

            {/* Total */}
            <div
              className="mt-4 rounded-xl p-4 text-center"
              style={{
                background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
              }}
            >
              <div className="text-xs text-green-200 font-medium">
                Total Work Order Value
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {formatINR(viewItem.totalAmount)}
              </div>
              <div className="text-xs text-green-300 mt-1">
                Retention: {viewItem.retentionPct}% ={" "}
                {formatINR(
                  (viewItem.totalAmount * viewItem.retentionPct) / 100,
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) setFormOpen(false);
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-ocid="paygo.workorder.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Work Order" : "New Work Order"}
            </DialogTitle>
          </DialogHeader>

          {/* Step tabs */}
          <div className="flex gap-4 border-b pb-2">
            <button
              type="button"
              onClick={() => setFormStep("details")}
              className={`text-sm font-semibold pb-1 border-b-2 ${formStep === "details" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setFormStep("items")}
              className={`text-sm font-semibold pb-1 border-b-2 ${formStep === "items" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}
            >
              BOQ Items ({form.items.length} selected)
            </button>
          </div>

          {formStep === "details" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Project *</Label>
                <Select
                  value={form.project}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      project: v,
                      contractor: "",
                      boqId: "",
                      items: [],
                    }))
                  }
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
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, contractor: v }))
                  }
                  disabled={!form.project}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.project
                          ? "Select Contractor"
                          : "Select project first"
                      }
                    />
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
                <Label className="text-xs font-semibold">BOQ</Label>
                <Select
                  value={form.boqId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, boqId: v, items: [] }))
                  }
                  disabled={!form.project}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BOQ (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectBOQs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Work Order Date</Label>
                <Input
                  type="date"
                  value={form.workOrderDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, workOrderDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Retention %</Label>
                <Input
                  type="number"
                  value={form.retentionPct || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      retentionPct: Number(e.target.value),
                    }))
                  }
                  placeholder="5"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as PayGoWorkOrder["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["Draft", "Issued", "In Progress", "Completed"] as const
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Scope of Work</Label>
                <Textarea
                  value={form.scopeOfWork}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopeOfWork: e.target.value }))
                  }
                  rows={2}
                  placeholder="Describe the scope of work..."
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Payment Terms</Label>
                <Textarea
                  value={form.paymentTerms}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentTerms: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">
                  Special Conditions / Notes
                </Label>
                <Textarea
                  value={form.specialConditions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      specialConditions: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
            </div>
          )}

          {formStep === "items" && (
            <div className="py-2">
              {!selectedBOQ ? (
                <p className="text-sm text-gray-400 italic py-6 text-center">
                  Select a BOQ in the Details tab to choose items
                </p>
              ) : (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {allBOQItems.map(({ catName, subName, item }) => {
                    const selected = form.items.find(
                      (i) => i.boqItemId === item.id,
                    );
                    const selectedItem = selected;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${selected ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() =>
                            toggleBOQItem(
                              item.id,
                              item.description,
                              item.unit,
                              item.qty,
                              item.rate,
                            )
                          }
                          className="w-4 h-4 accent-green-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-700 truncate">
                            {item.description}
                          </div>
                          <div className="text-xs text-gray-400">
                            {catName} &rsaquo; {subName} &mdash; {item.unit}
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-500">Qty:</span>
                            <input
                              type="number"
                              value={selectedItem?.qty || ""}
                              onChange={(e) =>
                                updateWOItemQty(item.id, Number(e.target.value))
                              }
                              className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 text-center"
                            />
                            <span
                              className="text-xs font-semibold"
                              style={{ color: GREEN }}
                            >
                              {formatINR((selectedItem?.qty || 0) * item.rate)}
                            </span>
                          </div>
                        )}
                        {!selected && (
                          <span className="text-xs text-gray-400">
                            {item.qty.toFixed(2)} {item.unit} ×{" "}
                            {formatINR(item.rate)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total summary */}
              <div
                className="mt-4 rounded-xl p-3 text-center"
                style={{
                  background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
                }}
              >
                <div className="text-xs text-green-200">
                  Total Work Order Value
                </div>
                <div className="text-xl font-bold text-white">
                  {formatINR(totalWOAmount)}
                </div>
                <div className="text-xs text-green-300">
                  Retention {form.retentionPct}%:{" "}
                  {formatINR((totalWOAmount * form.retentionPct) / 100)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              data-ocid="paygo.workorder.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave("Draft")}
              className="border-gray-400 text-gray-700"
              data-ocid="paygo.workorder.save_button"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave("Issued")}
              style={{ background: GREEN, color: "#fff" }}
              data-ocid="paygo.workorder.submit_button"
            >
              Issue Work Order
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
        <DialogContent data-ocid="paygo.workorder.dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this work order.
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
              data-ocid="paygo.workorder.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              data-ocid="paygo.workorder.delete_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
