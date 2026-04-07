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
  Briefcase,
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
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type PayGoContractor, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const TEAL = "#0891b2";
const DEFAULT_PW = "3554";

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

type FormData = Omit<PayGoContractor, "id">;
type SortDir = "asc" | "desc" | null;
type SortCol = keyof PayGoContractor | null;

const emptyForm = (): FormData => ({
  name: "",
  trade: "",
  subTrade: "",
  project: "",
  contractingPrice: 0,
  unit: "Sft",
  contact: "",
  email: "",
  address: "",
  attachmentLink1: "",
  attachmentLink2: "",
  notes: "",
  status: "Active",
});

type Filters = {
  contractorName: string;
  trade: string;
  project: string;
  year: string;
  fromDate: string;
  toDate: string;
  minPrice: string;
  maxPrice: string;
};

const emptyFilters = (): Filters => ({
  contractorName: "",
  trade: "",
  project: "",
  year: "",
  fromDate: "",
  toDate: "",
  minPrice: "",
  maxPrice: "",
});

interface Props {
  onNavigate?: (module: string) => void;
}

export default function PayGoContractorsPage({ onNavigate }: Props) {
  const {
    projects,
    contractors,
    addContractor,
    updateContractor,
    deleteContractor,
  } = usePayGo();

  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const isAdmin = currentRole === "Admin";

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoContractor | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [viewItem, setViewItem] = useState<PayGoContractor | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<string, string>>>(
    {},
  );
  const importRef = useRef<HTMLInputElement>(null);

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );
  const tradeNames = useMemo(
    () => [...new Set(contractors.map((c) => c.trade).filter(Boolean))],
    [contractors],
  );
  const yearOptions = useMemo(() => {
    const yr = new Date().getFullYear();
    const years = new Set<string>([String(yr), String(yr - 1), String(yr - 2)]);
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, []);

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
    let list = contractors.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.project.toLowerCase().includes(q);
      const matchName =
        !filters.contractorName ||
        c.name.toLowerCase().includes(filters.contractorName.toLowerCase());
      const matchTrade = !filters.trade || c.trade === filters.trade;
      const matchProject = !filters.project || c.project === filters.project;
      const matchMinPrice =
        !filters.minPrice || c.contractingPrice >= Number(filters.minPrice);
      const matchMaxPrice =
        !filters.maxPrice || c.contractingPrice <= Number(filters.maxPrice);
      // column filters
      const matchColName =
        !colFilters.name ||
        c.name.toLowerCase().includes((colFilters.name ?? "").toLowerCase());
      const matchColTrade =
        !colFilters.trade ||
        c.trade.toLowerCase().includes((colFilters.trade ?? "").toLowerCase());
      const matchColStatus =
        !colFilters.status ||
        c.status
          .toLowerCase()
          .includes((colFilters.status ?? "").toLowerCase());
      return (
        matchSearch &&
        matchName &&
        matchTrade &&
        matchProject &&
        matchMinPrice &&
        matchMaxPrice &&
        matchColName &&
        matchColTrade &&
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
  }, [contractors, search, filters, sortCol, sortDir, colFilters]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (c: PayGoContractor) => {
    setEditItem(c);
    setForm({
      name: c.name,
      trade: c.trade,
      subTrade: c.subTrade ?? "",
      project: c.project,
      contractingPrice: c.contractingPrice,
      unit: c.unit,
      contact: c.contact,
      email: c.email,
      address: c.address,
      attachmentLink1: c.attachmentLink1 ?? "",
      attachmentLink2: c.attachmentLink2 ?? "",
      notes: c.notes,
      status: c.status,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (editItem) {
      updateContractor({ ...editItem, ...form });
      toast.success("Contractor updated.");
    } else {
      addContractor(form);
      toast.success("Contractor added.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteContractor(deleteId);
    toast.success("Contractor deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Trade",
      "Sub-Trade",
      "Project",
      "Unit Price",
      "Unit",
      "Contact No 1",
      "Contact No 2",
      "Email",
      "Link 1",
      "Link 2",
      "Address",
      "Notes",
      "Status",
    ];
    const rows = contractors.map((c) => [
      c.name,
      c.trade,
      c.subTrade ?? "",
      c.project,
      c.contractingPrice,
      c.unit,
      c.contact,
      "",
      c.email,
      c.attachmentLink1 ?? "",
      c.attachmentLink2 ?? "",
      c.address,
      c.notes,
      c.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-contractors.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const downloadFormat = () => {
    const headers = [
      "Name",
      "Trade",
      "Sub-Trade",
      "Project",
      "Unit Price",
      "Unit",
      "Contact No 1",
      "Contact No 2",
      "Email",
      "Link 1",
      "Link 2",
      "Address",
      "Notes",
    ];
    const example = [
      "Ramesh & Sons",
      "Mason",
      "Foundation",
      "Sunrise Towers",
      "1000",
      "Sft",
      "9876543210",
      "",
      "ramesh@example.com",
      "",
      "",
      "Chennai, TN",
      "Sample note",
    ];
    const csv = [headers, example]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-contractors-format.csv";
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
        if (cols.length < 1) continue;
        const get = (name: string) => {
          const idx = headers.findIndex((h) => h.includes(name));
          return idx >= 0 ? (cols[idx] ?? "") : "";
        };
        const name = get("name");
        if (!name) continue;
        addContractor({
          name,
          trade: get("trade"),
          subTrade: get("sub"),
          project: get("project"),
          contractingPrice: Number(get("unit price") || get("price")) || 0,
          unit: (get("unit") as string) || "Sft",
          contact: get("contact no 1") || get("contact"),
          email: get("email"),
          address: get("address"),
          attachmentLink1: get("link 1") || get("link1"),
          attachmentLink2: get("link 2") || get("link2"),
          notes: get("note"),
          status: "Active",
        });
        count++;
      }
      toast.success(`${count} contractor(s) imported.`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleShare = (c: PayGoContractor) => {
    const text = `Contractor: ${c.name}\nTrade: ${c.trade}\nSub-Trade: ${c.subTrade || "—"}\nProject: ${c.project}\nUnit Price: ${formatINR(c.contractingPrice)}\nUnit: ${c.unit}\nContact: ${c.contact}\nEmail: ${c.email}\nAddress: ${c.address}\nStatus: ${c.status}`;
    if (navigator.share) {
      navigator
        .share({ title: "Contractor Receipt", text })
        .catch(() => window.print());
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Details copied to clipboard."))
        .catch(() => window.print());
    }
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
    setSearch("");
    setColFilters({});
  };

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer whitespace-nowrap";

  const hasActiveFilters =
    search ||
    filters.contractorName ||
    filters.trade ||
    filters.project ||
    filters.fromDate ||
    filters.toDate ||
    filters.year ||
    filters.minPrice ||
    filters.maxPrice ||
    Object.values(colFilters).some(Boolean);

  const SortIcon = ({ col }: { col: keyof PayGoContractor }) => (
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

        {/* Work Order sub-module button */}
        <button
          type="button"
          onClick={() => onNavigate?.("workorder")}
          className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          style={{ background: "#e0f2fe", borderColor: TEAL, color: TEAL }}
          title="Open Work Order Module"
        >
          <Briefcase size={14} /> Work Order
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className={toolbarBtnClass}
        >
          <Printer size={14} /> Print
        </button>
        <button
          type="button"
          onClick={() => window.print()}
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

        {/* Search bar — between Download Format and +New Contractor */}
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search contractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
            data-ocid="paygo.contractors.search_input"
          />
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 text-white rounded-md px-4 py-1.5 text-xs font-semibold shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ background: GREEN }}
            data-ocid="paygo.contractors.primary_button"
          >
            <Plus size={14} /> New Contractor
          </button>
        )}
      </div>

      {/* Filter toggle row */}
      <div className="px-4 py-1.5 bg-white border-b flex items-center gap-2">
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
            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            Clear Filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Showing <strong>{filtered.length}</strong> /{" "}
          <strong>{contractors.length}</strong>
        </span>
      </div>

      {/* Filters Card — 2 rows */}
      {showFilters && (
        <div className="px-4 py-3 bg-amber-50 border-b border-yellow-200">
          <div className="rounded-xl border border-yellow-200 bg-amber-50 pb-3">
            <div className="flex items-center justify-between px-4 py-2 border-b border-yellow-200">
              <span className="text-xs font-semibold text-gray-700">
                Advanced Filters
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-red-500 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="text-xs font-medium text-gray-500 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-100 transition-colors"
                >
                  Hide Filters
                </button>
              </div>
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-600">
                  Contractor
                </span>
                <select
                  value={filters.contractorName}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      contractorName: e.target.value,
                    }))
                  }
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">All Contractors</option>
                  {[...new Set(contractors.map((c) => c.name))].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-600">
                  Trade
                </span>
                <select
                  value={filters.trade}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, trade: e.target.value }))
                  }
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">All Trades</option>
                  {tradeNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
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
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-600">
                  Year
                </span>
                <select
                  value={filters.year}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, year: e.target.value }))
                  }
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-2">
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
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-600">
                  Min Unit Price (₹)
                </span>
                <input
                  type="number"
                  placeholder="Min price"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-600">
                  Max Unit Price (₹)
                </span>
                <input
                  type="number"
                  placeholder="Max price"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
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
                  <th className="px-3 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide whitespace-nowrap w-10">
                    #
                  </th>
                  {(
                    [
                      "name",
                      "trade",
                      "subTrade",
                      "project",
                      "contractingPrice",
                      "unit",
                      "contact",
                      "status",
                    ] as (keyof PayGoContractor)[]
                  ).map((col) => {
                    const labels: Record<string, string> = {
                      name: "Name",
                      trade: "Trade",
                      subTrade: "Sub-Trade",
                      project: "Project",
                      contractingPrice: "Price (₹)",
                      unit: "Unit",
                      contact: "Contact",
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
                          {/* Inline column filter for text cols */}
                          {["name", "trade", "status"].includes(col) && (
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
                      colSpan={10}
                      className="px-4 py-10 text-center text-gray-400 text-sm"
                      data-ocid="paygo.contractors.empty_state"
                    >
                      No contractors found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                      data-ocid={`paygo.contractors.item.${i + 1}`}
                    >
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{c.trade}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        {c.subTrade || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate">
                        {c.project}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                        {formatINR(c.contractingPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{c.unit}</td>
                      <td className="px-3 py-2.5 text-gray-600">{c.contact}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              c.status === "Active" ? "#d4edda" : "#e2e3e5",
                            color:
                              c.status === "Active" ? "#155724" : "#383d41",
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewItem(c)}
                            title="View"
                            className="text-emerald-600 hover:text-emerald-800"
                            data-ocid={`paygo.contractors.view_button.${i + 1}`}
                          >
                            <Eye size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
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
                                setDeleteId(c.id);
                                setPw("");
                              }}
                              title="Delete"
                              className="text-red-600 hover:text-red-800"
                              data-ocid={`paygo.contractors.delete_button.${i + 1}`}
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

      {/* View Receipt Modal — Share | Print | Close only (no duplicate X) */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent
            className="max-w-lg max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden"
            style={{ border: "3px solid #28A745" }}
            data-ocid="paygo.contractors.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Contractor Receipt
              </h2>
              {/* ONLY Share, Print, Close — no duplicate X */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleShare(viewItem)}
                  title="Share"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  data-ocid="paygo.contractors.share_button"
                >
                  <Share2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  data-ocid="paygo.contractors.print_button"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewItem(null)}
                  title="Close"
                  className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  data-ocid="paygo.contractors.close_button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
              {(
                [
                  ["Name", viewItem.name],
                  ["Trade", viewItem.trade],
                  ["Sub-Trade", viewItem.subTrade || "—"],
                  ["Project", viewItem.project],
                  ["Unit Price", formatINR(viewItem.contractingPrice)],
                  ["Unit", viewItem.unit],
                  ["Contact No", viewItem.contact],
                  ["Email", viewItem.email],
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
              {viewItem.attachmentLink1 && (
                <div className="col-span-2 flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    Link 1 (W.O):
                  </span>
                  <a
                    href={viewItem.attachmentLink1}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 underline truncate"
                  >
                    {viewItem.attachmentLink1}
                  </a>
                </div>
              )}
              {viewItem.attachmentLink2 && (
                <div className="col-span-2 flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    Link 2:
                  </span>
                  <a
                    href={viewItem.attachmentLink2}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 underline truncate"
                  >
                    {viewItem.attachmentLink2}
                  </a>
                </div>
              )}
              {viewItem.address && (
                <div className="col-span-2 flex gap-2">
                  <span className="w-28 text-gray-500 font-medium shrink-0 text-xs">
                    Address:
                  </span>
                  <span className="text-gray-800 text-xs">
                    {viewItem.address}
                  </span>
                </div>
              )}
              {viewItem.notes && (
                <div className="col-span-2">
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
          <DialogContent
            className="max-w-2xl max-h-[85vh] overflow-y-auto"
            data-ocid="paygo.contractors.dialog"
          >
            <DialogHeader>
              <DialogTitle style={{ color: GREEN }}>
                {editItem ? "Edit Contractor" : "New Contractor"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Contractor Name"
                  data-ocid="paygo.contractors.input"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Trade</Label>
                <Input
                  value={form.trade}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trade: e.target.value }))
                  }
                  placeholder="e.g. Mason, Scaffolding, M S"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Sub-Trade</Label>
                <Input
                  value={form.subTrade}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subTrade: e.target.value }))
                  }
                  placeholder="e.g. Foundation, Plastering"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Project</Label>
                <Select
                  value={form.project}
                  onValueChange={(v) => setForm((f) => ({ ...f, project: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectNames.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    <SelectItem value="-">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit Price (₹)</Label>
                <Input
                  type="number"
                  value={form.contractingPrice || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contractingPrice: Number(e.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
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
                <Label className="text-xs font-semibold">Contact No 1</Label>
                <Input
                  value={form.contact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value }))
                  }
                  placeholder="Mobile"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Address"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Attachment Link 1 (W.O)
                </Label>
                <Input
                  type="url"
                  value={form.attachmentLink1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, attachmentLink1: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Attachment Link 2
                </Label>
                <Input
                  type="url"
                  value={form.attachmentLink2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, attachmentLink2: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as PayGoContractor["status"],
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
                data-ocid="paygo.contractors.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md px-4 py-2 text-sm text-white font-semibold"
                style={{ background: GREEN }}
                data-ocid="paygo.contractors.submit_button"
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
          <DialogContent data-ocid="paygo.contractors.dialog">
            <DialogHeader>
              <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Enter admin password to delete this contractor.
            </p>
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter admin password"
              data-ocid="paygo.contractors.input"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                data-ocid="paygo.contractors.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 text-sm font-semibold"
                data-ocid="paygo.contractors.delete_button"
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
