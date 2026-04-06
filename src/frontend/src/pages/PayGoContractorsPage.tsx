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
import { type PayGoContractor, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
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
  fromDate: string;
  toDate: string;
  year: string;
  minPrice: string;
  maxPrice: string;
};

const emptyFilters = (): Filters => ({
  contractorName: "",
  trade: "",
  project: "",
  fromDate: "",
  toDate: "",
  year: "",
  minPrice: "",
  maxPrice: "",
});

export default function PayGoContractorsPage() {
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

  const projectNames = useMemo(
    () => [...new Set(projects.map((p) => p.name))],
    [projects],
  );

  const filtered = useMemo(() => {
    return contractors.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.project.toLowerCase().includes(q);
      const matchName =
        !filters.contractorName ||
        c.name.toLowerCase().includes(filters.contractorName.toLowerCase());
      const matchTrade =
        !filters.trade ||
        c.trade.toLowerCase().includes(filters.trade.toLowerCase());
      const matchProject = !filters.project || c.project === filters.project;
      const matchMinPrice =
        !filters.minPrice || c.contractingPrice >= Number(filters.minPrice);
      const matchMaxPrice =
        !filters.maxPrice || c.contractingPrice <= Number(filters.maxPrice);
      return (
        matchSearch &&
        matchName &&
        matchTrade &&
        matchProject &&
        matchMinPrice &&
        matchMaxPrice
      );
    });
  }, [contractors, search, filters]);

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
      "Contracting Price",
      "Unit",
      "Contact",
      "Email",
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
      c.email,
      c.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-contractors.csv";
    a.click();
    toast.success("CSV exported.");
  };

  const handleShare = (c: PayGoContractor) => {
    const text = `Contractor: ${c.name}\nTrade: ${c.trade}\nSub-Trade: ${c.subTrade || "—"}\nProject: ${c.project}\nContracting Price: ${formatINR(c.contractingPrice)}\nUnit: ${c.unit}\nContact: ${c.contact}\nEmail: ${c.email}\nAddress: ${c.address}\nStatus: ${c.status}`;
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
  };

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer";

  const hasActiveFilters =
    search ||
    filters.contractorName ||
    filters.trade ||
    filters.project ||
    filters.fromDate ||
    filters.toDate ||
    filters.year ||
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
            data-ocid="paygo.contractors.primary_button"
          >
            <Plus size={16} /> New Contractor
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
            placeholder="Search contractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
            data-ocid="paygo.contractors.search_input"
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

      {/* Filters Card */}
      {showFilters && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="rounded-xl shadow-sm border"
            style={{ background: "#FFFDE7", borderColor: "#FFE082" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200">
              <span className="font-semibold text-gray-700 text-sm">
                Filters
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
                  Contractor Name
                </span>
                <input
                  type="text"
                  placeholder="Search name"
                  value={filters.contractorName}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      contractorName: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Trade
                </span>
                <input
                  type="text"
                  placeholder="Search trade"
                  value={filters.trade}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, trade: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Project
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
                  From Date
                </span>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, fromDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Year
                </span>
                <input
                  type="text"
                  placeholder="e.g. 2025"
                  value={filters.year}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, year: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Min Unit Price (₹)
                </span>
                <input
                  type="number"
                  placeholder="Min price"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  Max Unit Price (₹)
                </span>
                <input
                  type="number"
                  placeholder="Max price"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center justify-between border-t border-yellow-200 pt-2">
              <span className="text-sm text-gray-500">
                Showing <strong>{filtered.length}</strong> of{" "}
                <strong>{contractors.length}</strong> contractors
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="px-4 pt-2 pb-1">
        <span className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{contractors.length}</strong> contractors
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
                    "Name",
                    "Trade",
                    "Sub-Trade",
                    "Project",
                    "Price (₹)",
                    "Unit",
                    "Contact",
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
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{c.trade}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {c.subTrade || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[120px] truncate">
                        {c.project}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        {formatINR(c.contractingPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{c.unit}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.contact}</td>
                      <td className="px-4 py-2.5">
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
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewItem(c)}
                            title="View"
                            className="text-emerald-600 hover:text-emerald-800"
                            data-ocid={`paygo.contractors.edit_button.${i + 1}`}
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

      {/* View Receipt Modal */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent
            className="max-w-lg max-h-[85vh] overflow-y-auto"
            style={{ border: "3px solid #28A745" }}
            data-ocid="paygo.contractors.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                Contractor Receipt
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(viewItem)}
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
                  ["Contracting Price", formatINR(viewItem.contractingPrice)],
                  ["Unit", viewItem.unit],
                  ["Contact", viewItem.contact],
                  ["Email", viewItem.email],
                  ["Status", viewItem.status],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-32 text-gray-500 font-medium shrink-0 text-xs">
                    {k}:
                  </span>
                  <span className="text-gray-800 font-semibold text-xs">
                    {v || "—"}
                  </span>
                </div>
              ))}
              {viewItem.attachmentLink1 && (
                <div className="col-span-2 flex gap-2">
                  <span className="w-32 text-gray-500 font-medium shrink-0 text-xs">
                    Attachment 1:
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
                  <span className="w-32 text-gray-500 font-medium shrink-0 text-xs">
                    Attachment 2:
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
                  <span className="w-32 text-gray-500 font-medium shrink-0 text-xs">
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
                <Label className="text-xs font-semibold">
                  Contracting Price (₹)
                </Label>
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
                <Label className="text-xs font-semibold">Contact</Label>
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
                  Attachment Link 1
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

      {/* Delete Confirm — admin only */}
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
