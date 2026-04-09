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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type PayGoProject, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";
import PayGoBOQPage from "./PayGoBOQPage";

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

interface DragOffset {
  x: number;
  y: number;
}

interface Props {
  onNavigate?: (module: string) => void;
}

export default function PayGoProjectsPage({ onNavigate: _onNavigate }: Props) {
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

  // Password prompt for edit
  const [editPwOpen, setEditPwOpen] = useState(false);
  const [editPwValue, setEditPwValue] = useState("");
  const [editPwError, setEditPwError] = useState("");
  const [pendingEditItem, setPendingEditItem] = useState<PayGoProject | null>(
    null,
  );

  // BOQ modal
  const [boqModalOpen, setBoqModalOpen] = useState(false);

  // Draggable form state
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [formPos, setFormPos] = useState<DragOffset>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const dragStart = useRef<{
    mx: number;
    my: number;
    ox: number;
    oy: number;
  } | null>(null);

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
      return matchSearch && matchProject && matchClient && matchFrom && matchTo;
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
  }, [projects, search, filters, sortCol, sortDir]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormPos({ x: 0, y: 0 });
    setHasDragged(false);
    setFormOpen(true);
  };

  // Edit requires password first
  const requestEdit = (p: PayGoProject) => {
    setPendingEditItem(p);
    setEditPwValue("");
    setEditPwError("");
    setEditPwOpen(true);
  };

  const confirmEditPw = () => {
    if (editPwValue !== DEFAULT_PW) {
      setEditPwError("Incorrect password");
      return;
    }
    setEditPwOpen(false);
    setEditPwError("");
    if (pendingEditItem) {
      setEditItem(pendingEditItem);
      setForm({
        name: pendingEditItem.name,
        client: pendingEditItem.client,
        startDate: pendingEditItem.startDate,
        endDate: pendingEditItem.endDate,
        budget: pendingEditItem.budget,
        unitPrice: pendingEditItem.unitPrice ?? 0,
        status: pendingEditItem.status,
        notes: pendingEditItem.notes,
      });
      setFormPos({ x: 0, y: 0 });
      setHasDragged(false);
      setFormOpen(true);
    }
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

  const handlePrint = () => {
    // Build a clean HTML table for printing the full projects list
    const rows = filtered
      .map(
        (p, i) => `
      <tr style="background:${i % 2 === 0 ? "#F0FFF4" : "#fff"}">
        <td>${i + 1}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.client}</td>
        <td>${fmtDate(p.startDate)}</td>
        <td>${fmtDate(p.endDate)}</td>
        <td style="text-align:right">${formatINR(p.budget)}</td>
        <td>${p.status}</td>
        <td>${p.notes || ""}</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Projects List — MPH Developers</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Century Gothic', Arial, sans-serif; font-size: 11px; color: #333; }
    h1 { font-size: 16px; color: #28A745; margin: 0 0 2px; }
    p { margin: 0 0 10px; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #28A745; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; vertical-align: middle; }
    .total-row td { font-weight: bold; background: #E8F5E9; }
  </style>
</head>
<body>
  <h1>MPH Developers — Projects List</h1>
  <p>Generated: ${new Date().toLocaleDateString("en-IN")} | Total: ${filtered.length} project(s)</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Project Name</th>
        <th>Client</th>
        <th>Start Date</th>
        <th>End Date</th>
        <th>Budget (₹)</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="5" style="text-align:right">Total Budget:</td>
        <td style="text-align:right">${formatINR(filtered.reduce((s, p) => s + p.budget, 0))}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
  };

  const handleExportPDF = () => {
    // Use same print approach but trigger PDF save via browser print dialog
    handlePrint();
    toast.info("Use 'Save as PDF' in the print dialog to export as PDF.");
  };

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

  // ── Draggable form handlers ──────────────────────────────────────────────
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = e.currentTarget.closest(
        "[data-draggable-form]",
      ) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragStart.current = {
        mx: e.clientX,
        my: e.clientY,
        ox:
          rect.left + (hasDragged ? 0 : window.innerWidth / 2 - rect.width / 2),
        oy: rect.top,
      };
      setIsDragging(true);
    },
    [hasDragged],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setDragOffset({ x: dx, y: dy });
    };
    const onUp = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setFormPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
      setHasDragged(true);
      dragStart.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer whitespace-nowrap";

  const hasActiveFilters =
    search ||
    filters.project ||
    filters.client ||
    filters.fromDate ||
    filters.toDate;

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

  // (draggable form uses inline position computed at render time)

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

        {/* BOQ sub-module button — opens inline modal */}
        <button
          type="button"
          onClick={() => setBoqModalOpen(true)}
          className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          style={{
            background: "#e0f2fe",
            borderColor: "#0891b2",
            color: "#0891b2",
          }}
          title="Open BOQ Module"
          data-ocid="paygo.projects.boq_button"
        >
          <FolderOpen size={14} /> BOQ
        </button>

        <button type="button" onClick={handlePrint} className={toolbarBtnClass}>
          <Printer size={14} /> Print
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          className={toolbarBtnClass}
          title="Export PDF"
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

        {/* Search bar */}
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

      {/* Filter toggle row */}
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

      {/* Filter Bar — hidden by default */}
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

      {/* Table — no column-level filter inputs */}
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
                        <div className="flex items-center gap-1">
                          {labels[col]}
                          <SortIcon col={col} />
                          {sortCol === col && (
                            <span className="text-yellow-200 text-xs">
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
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
                              onClick={() => requestEdit(p)}
                              title="Edit"
                              className="text-blue-600 hover:text-blue-800"
                              data-ocid={`paygo.projects.edit_button.${i + 1}`}
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
            className="max-w-lg [&>button:last-child]:hidden"
            style={{ border: "3px solid #0078D7" }}
            data-ocid="paygo.projects.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Project Receipt
              </h2>
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

      {/* Password Prompt for Edit */}
      <Dialog
        open={editPwOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditPwOpen(false);
            setEditPwError("");
            setEditPwValue("");
          }
        }}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="paygo.projects.edit_pw_dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#0078D7" }}>Confirm Edit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to edit this project.
          </p>
          <Input
            type="password"
            value={editPwValue}
            onChange={(e) => {
              setEditPwValue(e.target.value);
              setEditPwError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && confirmEditPw()}
            placeholder="Enter admin password"
            data-ocid="paygo.projects.edit_pw_input"
          />
          {editPwError && (
            <p className="text-xs text-red-600 font-medium">{editPwError}</p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setEditPwOpen(false);
                setEditPwError("");
                setEditPwValue("");
              }}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              data-ocid="paygo.projects.edit_pw_cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEditPw}
              className="rounded-md px-4 py-2 text-sm text-white font-semibold"
              style={{ background: "#0078D7" }}
              data-ocid="paygo.projects.edit_pw_confirm"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draggable Add / Edit Form */}
      {isAdmin && formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <div
            data-draggable-form
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${formPos.x + dragOffset.x}px, ${formPos.y + dragOffset.y}px)`,
              zIndex: 9999,
              width: "500px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              fontFamily: "'Century Gothic', Arial, sans-serif",
              ...(isDragging ? { userSelect: "none" } : {}),
            }}
          >
            {/* Draggable header */}
            <div
              onMouseDown={handleDragMouseDown}
              style={{
                cursor: isDragging ? "grabbing" : "grab",
                padding: "16px 20px 12px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f9fafb",
                borderRadius: "12px 12px 0 0",
                userSelect: "none",
              }}
            >
              <span className="text-base font-bold" style={{ color: GREEN }}>
                {editItem ? "Edit Project" : "New Project"}
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setFormOpen(false)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form body */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold">
                    Project Name *
                  </Label>
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

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
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
              </div>
            </div>
          </div>
        </div>
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

      {/* BOQ Inline Modal */}
      {boqModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "40px",
          }}
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBoqModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setBoqModalOpen(false);
          }}
        >
          <div
            style={{
              width: "95vw",
              maxWidth: "1300px",
              height: "calc(100vh - 80px)",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                background: "#e0f2fe",
                borderBottom: "2px solid #0891b2",
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen size={18} style={{ color: "#0891b2" }} />
                <span
                  className="text-base font-bold"
                  style={{ color: "#0891b2" }}
                >
                  BOQ — Bill of Quantities
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBoqModalOpen(false)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                title="Close BOQ"
              >
                <X size={18} />
              </button>
            </div>
            {/* BOQ page content */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <PayGoBOQPage />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
