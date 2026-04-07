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
  Download,
  Edit2,
  Eye,
  FileDown,
  FileText,
  FolderOpen,
  Plus,
  Printer,
  Search,
  Share2,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type PayGoProject, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const TEAL = "#0891b2";
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
type SortDir = "asc" | "desc" | null;
type SortCol = keyof PayGoProject | null;

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
  project: string;
  client: string;
  fromDate: string;
  toDate: string;
};

const emptyFilters = (): Filters => ({
  project: "",
  client: "",
  fromDate: "",
  toDate: "",
});

function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

interface Props {
  onNavigate?: (module: string) => void;
}

export default function PayGoProjectsPage({ onNavigate }: Props) {
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
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<string, string>>>(
    {},
  );
  const importRef = useRef<HTMLInputElement>(null);

  // Unique values for filter dropdowns
  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );
  const clientNames = useMemo(
    () => [...new Set(projects.map((p) => p.client))],
    [projects],
  );

  const applySort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q);
      const matchProject = !filters.project || p.name === filters.project;
      const matchClient = !filters.client || p.client === filters.client;
      const matchFrom = !filters.fromDate || p.startDate >= filters.fromDate;
      const matchTo = !filters.toDate || p.startDate <= filters.toDate;
      // column filters
      const matchColName =
        !colFilters.name ||
        p.name.toLowerCase().includes(colFilters.name.toLowerCase());
      const matchColClient =
        !colFilters.client ||
        p.client.toLowerCase().includes(colFilters.client.toLowerCase());
      const matchColStatus =
        !colFilters.status ||
        p.status.toLowerCase().includes(colFilters.status.toLowerCase());
      return (
        matchSearch &&
        matchProject &&
        matchClient &&
        matchFrom &&
        matchTo &&
        matchColName &&
        matchColClient &&
        matchColStatus
      );
    });
    if (sortCol && sortDir) {
      list = [...list].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
        });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [projects, search, filters, sortCol, sortDir, colFilters]);

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
      "Project Name",
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
      fmtDate(p.startDate),
      fmtDate(p.endDate),
      p.budget,
      p.status,
      p.notes,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-projects.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const downloadFormat = () => {
    const headers = [
      "Project Name",
      "Client",
      "Start Date",
      "End Date",
      "Budget",
      "Status",
      "Notes",
    ];
    const example = [
      "Sunrise Towers",
      "Sunrise Developers",
      "01-01-2025",
      "31-12-2025",
      "5000000",
      "Active",
      "Sample project",
    ];
    const csv = [headers, example]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mph-projects-format.csv";
    a.click();
    toast.success("Format downloaded.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        toast.error("No data rows found.");
        return;
      }
      const parseRow = (line: string) =>
        line
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
      const headers = parseRow(lines[0]).map((h) => h.toLowerCase());
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 2) continue;
        const get = (name: string) => {
          const idx = headers.findIndex((h) => h.includes(name));
          return idx >= 0 ? (cols[idx] ?? "") : "";
        };
        const name = get("project") || get("name");
        const client = get("client");
        if (!name || !client) continue;
        addProject({
          name,
          client,
          startDate: get("start"),
          endDate: get("end"),
          budget: Number(get("budget")) || 0,
          unitPrice: 0,
          status: (get("status") as PayGoProject["status"]) || "Active",
          notes: get("note"),
        });
        count++;
      }
      toast.success(`${count} project(s) imported.`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePrint = () => window.print();

  const clearFilters = () => {
    setFilters(emptyFilters());
    setSearch("");
    setColFilters({});
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
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer whitespace-nowrap";

  const hasActiveFilters =
    search ||
    filters.project ||
    filters.client ||
    filters.fromDate ||
    filters.toDate ||
    Object.values(colFilters).some(Boolean);

  const SortIcon = ({ col }: { col: keyof PayGoProject }) => (
    <ArrowUpDown
      size={12}
      className={`inline ml-1 cursor-pointer opacity-60 hover:opacity-100 ${sortCol === col ? "opacity-100 text-yellow-200" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        applySort(col);
      }}
    />
  );

  return (
    <div
      className="flex flex-col gap-0"
      style={{ fontFamily: "'Century Gothic', Arial, sans-serif" }}
    >
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-2 flex-wrap">
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

        {/* BOQ sub-module button */}
        <button
          type="button"
          onClick={() => onNavigate?.("boq")}
          className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          style={{ background: "#e0f2fe", borderColor: TEAL, color: TEAL }}
          title="Open BOQ Module"
        >
          <FolderOpen size={14} /> BOQ
        </button>

        <button type="button" onClick={handlePrint} className={toolbarBtnClass}>
          <Printer size={14} /> Print
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className={toolbarBtnClass}
          title="Export PDF (uses print dialog)"
        >
          <FileText size={14} /> Export PDF
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className={toolbarBtnClass}
            >
              <Upload size={14} /> Import CSV
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
          </>
        )}
        <button type="button" onClick={exportCSV} className={toolbarBtnClass}>
          <Download size={14} /> Export CSV
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={downloadFormat}
            className={toolbarBtnClass}
          >
            <FileDown size={14} /> Download Format
          </button>
        )}

        {/* Search bar — between Download Format and +New Project */}
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
            data-ocid="paygo.projects.search_input"
          />
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-xs font-semibold shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ background: GREEN }}
            data-ocid="paygo.projects.primary_button"
          >
            <Plus size={14} /> New Project
          </button>
        )}
      </div>

      {/* Filter toggle row — single horizontal row, fixed height */}
      <div className="px-4 py-1.5 bg-white border-b flex items-center gap-1">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors border border-gray-200 rounded px-2 py-1 bg-gray-50 hover:bg-gray-100"
        >
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
          {hasActiveFilters && (
            <span
              className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
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
            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors ml-2"
          >
            Clear Filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Showing <strong>{filtered.length}</strong> /{" "}
          <strong>{projects.length}</strong>
        </span>
      </div>

      {/* Filter Bar — single row, hidden by default */}
      {showFilters && (
        <div className="px-4 py-2 bg-amber-50 border-b border-yellow-200">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs font-semibold text-gray-600">
                Project
              </span>
              <select
                value={filters.project}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, project: e.target.value }))
                }
                className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="">All Projects</option>
                {projectNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs font-semibold text-gray-600">
                Client
              </span>
              <select
                value={filters.client}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, client: e.target.value }))
                }
                className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="">All Clients</option>
                {clientNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">
                From Date
              </span>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, fromDate: e.target.value }))
                }
                className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">
                To Date
              </span>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, toDate: e.target.value }))
                }
                className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-red-500 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors self-end"
            >
              Clear
            </button>
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
                  <th className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap w-10">
                    #
                  </th>
                  {(
                    [
                      "name",
                      "client",
                      "startDate",
                      "endDate",
                      "budget",
                      "status",
                    ] as (keyof PayGoProject)[]
                  ).map((col) => {
                    const labels: Record<string, string> = {
                      name: "Project Name",
                      client: "Client",
                      startDate: "Start Date",
                      endDate: "End Date",
                      budget: "Budget (₹)",
                      status: "Status",
                    };
                    return (
                      <th
                        key={col}
                        className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap cursor-pointer select-none"
                        onClick={() => applySort(col)}
                        onKeyDown={(e) => e.key === "Enter" && applySort(col)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            {labels[col]}
                            <SortIcon col={col} />
                            {sortCol === col && (
                              <span className="text-yellow-200 text-xs">
                                {sortDir === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          {/* Inline column filter */}
                          {["name", "client", "status"].includes(col) && (
                            <input
                              type="text"
                              placeholder="Filter…"
                              value={colFilters[col] ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setColFilters((f) => ({
                                  ...f,
                                  [col]: e.target.value,
                                }))
                              }
                              className="mt-0.5 rounded px-1.5 py-0.5 text-xs text-gray-700 bg-white border-0 focus:outline-none focus:ring-1 focus:ring-yellow-300 w-full"
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                    Actions
                  </th>
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
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">
                        {p.name}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{p.client}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(p.startDate)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(p.endDate)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                        {formatINR(p.budget)}
                      </td>
                      <td className="px-3 py-2.5">
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
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewItem(p)}
                            title="View"
                            className="text-emerald-600 hover:text-emerald-800"
                            data-ocid={`paygo.projects.view_button.${i + 1}`}
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

      {/* View Receipt Modal — Share | Print | Close (no duplicate X) */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent
            className="max-w-lg [&>button:last-child]:hidden"
            style={{ border: "3px solid #0078D7" }}
            data-ocid="paygo.projects.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Project Receipt
              </h2>
              {/* ONLY these 3 icons — no duplicate X from DialogContent default */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleShare(viewItem)}
                  title="Share"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  data-ocid="paygo.projects.share_button"
                >
                  <Share2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  data-ocid="paygo.projects.print_button"
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

      {/* Delete Confirm */}
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
