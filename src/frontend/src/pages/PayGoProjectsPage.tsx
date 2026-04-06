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
  Download,
  Edit2,
  Eye,
  FileDown,
  FileText,
  Plus,
  Printer,
  Search,
  Share2,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type PayGoProject, usePayGo } from "../context/PayGoContext";
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

type FormData = Omit<PayGoProject, "id">;

const emptyForm = (): FormData => ({
  name: "",
  client: "",
  startDate: "",
  endDate: "",
  budget: 0,
  unitPrice: 0,
  status: "Active",
  notes: "",
});

type Filters = {
  projectName: string;
  clientName: string;
  fromDate: string;
  toDate: string;
  minPrice: string;
  maxPrice: string;
};

const emptyFilters = (): Filters => ({
  projectName: "",
  clientName: "",
  fromDate: "",
  toDate: "",
  minPrice: "",
  maxPrice: "",
});

function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

export default function PayGoProjectsPage() {
  const { projects, addProject, updateProject, deleteProject } = usePayGo();

  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const isAdmin = currentRole === "Admin";

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoProject | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [viewItem, setViewItem] = useState<PayGoProject | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q);
      const matchName =
        !filters.projectName ||
        p.name.toLowerCase().includes(filters.projectName.toLowerCase());
      const matchClient =
        !filters.clientName ||
        p.client.toLowerCase().includes(filters.clientName.toLowerCase());
      const matchFrom = !filters.fromDate || p.startDate >= filters.fromDate;
      const matchTo = !filters.toDate || p.startDate <= filters.toDate;
      const matchMinPrice =
        !filters.minPrice || p.unitPrice >= Number(filters.minPrice);
      const matchMaxPrice =
        !filters.maxPrice || p.unitPrice <= Number(filters.maxPrice);
      return (
        matchSearch &&
        matchName &&
        matchClient &&
        matchFrom &&
        matchTo &&
        matchMinPrice &&
        matchMaxPrice
      );
    });
  }, [projects, search, filters]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (p: PayGoProject) => {
    setEditItem(p);
    setForm({
      name: p.name,
      client: p.client,
      startDate: p.startDate,
      endDate: p.endDate,
      budget: p.budget,
      unitPrice: p.unitPrice ?? 0,
      status: p.status,
      notes: p.notes,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.client.trim()) {
      toast.error("Project Name and Client are required.");
      return;
    }
    if (editItem) {
      updateProject({ ...editItem, ...form });
      toast.success("Project updated.");
    } else {
      addProject(form);
      toast.success("Project added.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteProject(deleteId);
    toast.success("Project deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Client",
      "Start Date",
      "End Date",
      "Budget",
      "Status",
      "Notes",
    ];
    const rows = projects.map((p) => [
      p.name,
      p.client,
      p.startDate,
      p.endDate,
      p.budget,
      p.status,
      p.notes,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-projects.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const handlePrint = () => window.print();

  const clearFilters = () => {
    setFilters(emptyFilters());
    setSearch("");
  };

  const handleShare = (p: PayGoProject) => {
    const text = `Project: ${p.name}\nClient: ${p.client}\nStart: ${fmtDate(p.startDate)}\nEnd: ${fmtDate(p.endDate)}\nBudget: ${formatINR(p.budget)}\nStatus: ${p.status}`;
    if (navigator.share) {
      navigator
        .share({ title: "Project Receipt", text })
        .catch(() => window.print());
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Details copied to clipboard."))
        .catch(() => window.print());
    }
  };

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer";

  const hasActiveFilters =
    search ||
    filters.projectName ||
    filters.clientName ||
    filters.fromDate ||
    filters.toDate ||
    filters.minPrice ||
    filters.maxPrice;

  return (
    <div
      className="flex flex-col gap-0"
      style={{ fontFamily: "'Century Gothic', Arial, sans-serif" }}
    >
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role switcher */}
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

          <button
            type="button"
            onClick={handlePrint}
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
          <button type="button" onClick={exportCSV} className={toolbarBtnClass}>
            <Download size={14} /> Export CSV
          </button>
          {isAdmin && (
            <button type="button" className={toolbarBtnClass}>
              <FileDown size={14} /> Download Format
            </button>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
            style={{ background: GREEN }}
            data-ocid="paygo.projects.primary_button"
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
            data-ocid="paygo.projects.search_input"
          />
        </div>
      </div>

      {/* Filter toggle bar */}
      <div className="px-4 py-2 bg-white border-b flex items-center justify-start">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
          {hasActiveFilters && !showFilters && (
            <span
              className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: GREEN, color: "#fff" }}
            >
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-4 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters Card */}
      {showFilters && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="rounded-xl shadow-sm border"
            style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200">
              <span className="font-semibold text-gray-700 text-sm">
                Advanced Filters
                {hasActiveFilters && (
                  <span
                    className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: GREEN, color: "#fff" }}
                  >
                    Active
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1 hover:bg-red-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pb-4 pt-3">
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Project Name
                </span>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={filters.projectName}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, projectName: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Client Name
                </span>
                <input
                  type="text"
                  placeholder="Enter client name"
                  value={filters.clientName}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, clientName: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  From Date
                </span>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, fromDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  To Date
                </span>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, toDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Min Budget (₹)
                </span>
                <input
                  type="number"
                  placeholder="Min budget"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Max Budget (₹)
                </span>
                <input
                  type="number"
                  placeholder="Max budget"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="px-4 pt-2 pb-1">
        <span className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{projects.length}</strong> projects
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
                    "Project Name",
                    "Client",
                    "Start Date",
                    "End Date",
                    "Budget (₹)",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
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
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-400 text-sm"
                      data-ocid="paygo.projects.empty_state"
                    >
                      No projects found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ background: i % 2 === 0 ? "#F0FFF4" : "#fff" }}
                      data-ocid={`paygo.projects.item.${i + 1}`}
                    >
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">
                        {p.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{p.client}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(p.startDate)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(p.endDate)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                        {formatINR(p.budget)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              p.status === "Active" ? "#d4edda" : "#e2e3e5",
                            color:
                              p.status === "Active" ? "#155724" : "#383d41",
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewItem(p)}
                            title="View"
                            className="text-emerald-600 hover:text-emerald-800"
                            data-ocid={`paygo.projects.edit_button.${i + 1}`}
                          >
                            <Eye size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              title="Edit"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 size={15} />
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
                              className="text-red-600 hover:text-red-800"
                              data-ocid={`paygo.projects.delete_button.${i + 1}`}
                            >
                              <Trash2 size={15} />
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

      {/* View Receipt Modal */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent
            className="max-w-lg"
            style={{ border: "3px solid #0078D7" }}
            data-ocid="paygo.projects.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Project Receipt
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(viewItem)}
                  title="Share"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  data-ocid="paygo.projects.secondary_button"
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
                  onClick={() => setViewItem(null)}
                  title="Close"
                  className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  data-ocid="paygo.projects.close_button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
              {(
                [
                  ["Project Name", viewItem.name],
                  ["Client", viewItem.client],
                  ["Start Date", fmtDate(viewItem.startDate)],
                  ["End Date", fmtDate(viewItem.endDate)],
                  ["Budget (₹)", formatINR(viewItem.budget)],
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
              {viewItem.notes && (
                <div className="col-span-2 mt-1">
                  <span className="text-xs text-gray-500 font-medium">
                    Notes:
                  </span>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {viewItem.notes}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Dialog — admin only */}
      {isAdmin && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg" data-ocid="paygo.projects.dialog">
            <DialogHeader>
              <DialogTitle style={{ color: GREEN }}>
                {editItem ? "Edit Project" : "New Project"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Project Name"
                  data-ocid="paygo.projects.input"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Client *</Label>
                <Input
                  value={form.client}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client: e.target.value }))
                  }
                  placeholder="Client Name"
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
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Budget (₹)</Label>
                <Input
                  type="number"
                  value={form.budget || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, budget: Number(e.target.value) }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as PayGoProject["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                data-ocid="paygo.projects.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md px-4 py-2 text-sm text-white font-semibold"
                style={{ background: GREEN }}
                data-ocid="paygo.projects.submit_button"
              >
                Save
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm — admin only */}
      {isAdmin && (
        <Dialog
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) setDeleteId(null);
          }}
        >
          <DialogContent data-ocid="paygo.projects.dialog">
            <DialogHeader>
              <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Enter admin password to delete this project.
            </p>
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter admin password"
              data-ocid="paygo.projects.input"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                data-ocid="paygo.projects.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 text-sm font-semibold"
                data-ocid="paygo.projects.delete_button"
              >
                Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
