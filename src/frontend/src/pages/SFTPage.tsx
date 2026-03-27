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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import {
  useGetAllProjects,
  useGetCallerUserProfile,
  useGetCompletedProjectIds,
} from "../hooks/useQueries";
import { shareReceiptAsImage } from "../utils/receiptShare";

type SftRecord = {
  id: string;
  contractorId: string;
  projectId: string;
  billNo: string;
  slabNo: string;
  footings: number;
  rw: number;
  columns: number;
  beams: number;
  slab: number;
  oht: number;
  totalSft: number;
  remarks: string;
};

const EMPTY_FORM = {
  contractorId: "",
  projectId: "",
  billNo: "",
  slabNo: "",
  footings: "",
  rw: "",
  columns: "",
  beams: "",
  slab: "",
  oht: "",
  remarks: "",
};

const fontStyle = { fontFamily: "Century Gothic, Gothic A1, sans-serif" };

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function printReceiptSFT(
  record: SftRecord,
  contractorName: string,
  projectName: string,
) {
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SFT Receipt</title><style>
    @page{size:A4 portrait;margin:20mm 15mm}
    body{font-family:'Century Gothic',Arial,sans-serif;margin:0;padding:0;background:#fff;max-height:148mm;overflow:hidden;position:relative}
    body::after{content:"ClearPay";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-family:'Century Gothic',Arial,sans-serif;font-size:72pt;font-weight:700;color:#0078D7;opacity:0.10;pointer-events:none;z-index:9999}
    .header{background:#0078D7;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
    .header h1{margin:0;font-size:17px;font-weight:700}
    .body{border:3px solid #0078D7;margin:10px;padding:12px;border-radius:4px}
    .body h2{margin:0 0 8px;color:#0078D7;font-size:13px;font-weight:700}
    table{width:100%;border-collapse:collapse;font-size:11px}
    tr:nth-child(even){background:#E3F2FD}
    td{padding:4px 8px;border-bottom:1px solid #e0e0e0}
    td:first-child{font-weight:600;color:#555;width:45%}
    .footer{text-align:center;font-size:10px;color:#888;padding:8px;border-top:1px solid #eee;margin-top:8px}
    .total{background:#0078D7;color:#fff;font-weight:700}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="header"><h1>ClearPay – SFT Receipt</h1><small>SFT Module</small></div>
    <div class="body">
      <h2>SFT Details</h2>
      <table>
        <tr><td>Contractor</td><td>${contractorName}</td></tr>
        <tr><td>Project</td><td>${projectName}</td></tr>
        <tr><td>Bill No</td><td>${record.billNo}</td></tr>
        <tr><td>Slab No</td><td>${record.slabNo}</td></tr>
        <tr><td>Footings</td><td>${fmt(record.footings)} SFT</td></tr>
        <tr><td>R/W</td><td>${fmt(record.rw)} SFT</td></tr>
        <tr><td>Columns</td><td>${fmt(record.columns)} SFT</td></tr>
        <tr><td>Beams</td><td>${fmt(record.beams)} SFT</td></tr>
        <tr><td>Slab</td><td>${fmt(record.slab)} SFT</td></tr>
        <tr><td>OHT</td><td>${fmt(record.oht)} SFT</td></tr>
        <tr class="total"><td>Total SFT</td><td>${fmt(record.totalSft)} SFT</td></tr>
        ${record.remarks ? `<tr><td>Remarks</td><td>${record.remarks}</td></tr>` : ""}
      </table>
    </div>
    <div class="footer">© 2025 ClearPay. Powered by Seri AI.</div>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function SFTPage() {
  const { actor } = useActor();
  const { isMasterAdmin } = useMasterAdmin();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: allProjects = [] } = useGetAllProjects();
  const { data: completedProjectIds = [] } = useGetCompletedProjectIds();
  const isAdmin = isMasterAdmin || userProfile?.role === "admin";

  const activeProjects = allProjects.filter(
    (p) => !completedProjectIds.includes(p.id),
  );

  // Contractors data
  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => actor!.listContractors(),
    enabled: !!actor,
  });
  const activeContractors = (contractors as any[]).filter((c) => !c.completed);

  // SFT entries data
  const { data: sftEntries = [] } = useQuery({
    queryKey: ["sftEntries"],
    queryFn: () => actor!.listSftEntries(),
    enabled: !!actor,
  });

  // State
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<SftRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<SftRecord | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    type: "edit" | "delete" | "bulkDelete";
    data?: unknown;
  }>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterContractor, setFilterContractor] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const setField = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const totalSft = useMemo(() => {
    const n = (s: string) => Number.parseFloat(s) || 0;
    return (
      n(form.footings) +
      n(form.rw) +
      n(form.columns) +
      n(form.beams) +
      n(form.slab) +
      n(form.oht)
    );
  }, [form.footings, form.rw, form.columns, form.beams, form.slab, form.oht]);

  const getContractorName = (id: string) =>
    (contractors as any[]).find((c) => c.id === id)?.name || id;
  const getProjectName = (id: string) =>
    allProjects.find((p) => p.id === id)?.name || id;

  // Filtered + sorted entries
  const filtered = useMemo(() => {
    let rows = sftEntries as SftRecord[];
    if (filterContractor)
      rows = rows.filter((r) => r.contractorId === filterContractor);
    if (filterProject) rows = rows.filter((r) => r.projectId === filterProject);
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = (a as any)[sortCol];
        const bv = (b as any)[sortCol];
        if (typeof av === "number") return sortAsc ? av - bv : bv - av;
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [sftEntries, filterContractor, filterProject, sortCol, sortAsc]);

  const totalSftSum = useMemo(
    () => filtered.reduce((s, r) => s + r.totalSft, 0),
    [filtered],
  );

  const addMutation = useMutation({
    mutationFn: (f: typeof EMPTY_FORM) =>
      actor!.addSftEntry(
        f.contractorId,
        f.projectId,
        f.billNo,
        f.slabNo,
        Number.parseFloat(f.footings) || 0,
        Number.parseFloat(f.rw) || 0,
        Number.parseFloat(f.columns) || 0,
        Number.parseFloat(f.beams) || 0,
        Number.parseFloat(f.slab) || 0,
        Number.parseFloat(f.oht) || 0,
        f.remarks,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sftEntries"] });
      toast.success("SFT entry saved");
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const editMutation = useMutation({
    mutationFn: ({ f, pwd }: { f: typeof EMPTY_FORM; pwd: string }) =>
      actor!.updateSftEntry(
        editRecord!.id,
        f.contractorId,
        f.projectId,
        f.billNo,
        f.slabNo,
        Number.parseFloat(f.footings) || 0,
        Number.parseFloat(f.rw) || 0,
        Number.parseFloat(f.columns) || 0,
        Number.parseFloat(f.beams) || 0,
        Number.parseFloat(f.slab) || 0,
        Number.parseFloat(f.oht) || 0,
        f.remarks,
        pwd,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sftEntries"] });
      toast.success("SFT entry updated");
      setShowForm(false);
      setEditRecord(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ ids, pwd }: { ids: string[]; pwd: string }) =>
      actor!.deleteSftEntries(ids, pwd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sftEntries"] });
      toast.success("Deleted");
      setSelectedIds([]);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });

  function handleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortAsc ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  }

  function openNew() {
    setEditRecord(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(r: SftRecord) {
    setEditRecord(r);
    setForm({
      contractorId: r.contractorId,
      projectId: r.projectId,
      billNo: r.billNo,
      slabNo: r.slabNo,
      footings: String(r.footings),
      rw: String(r.rw),
      columns: String(r.columns),
      beams: String(r.beams),
      slab: String(r.slab),
      oht: String(r.oht),
      remarks: r.remarks,
    });
    setShowForm(true);
  }

  function handleSaveForm() {
    if (!form.contractorId || !form.projectId) {
      toast.error("Contractor and Project are required");
      return;
    }
    if (editRecord) {
      setPendingAction({ type: "edit" });
      setPassword("");
      setShowPasswordModal(true);
    } else {
      addMutation.mutate(form);
    }
  }

  function handlePasswordConfirm() {
    if (!pendingAction) return;
    if (pendingAction.type === "edit") {
      editMutation.mutate({ f: form, pwd: password });
    } else if (pendingAction.type === "delete") {
      deleteMutation.mutate({
        ids: [(pendingAction.data as SftRecord).id],
        pwd: password,
      });
    } else if (pendingAction.type === "bulkDelete") {
      deleteMutation.mutate({ ids: selectedIds, pwd: password });
    }
    setShowPasswordModal(false);
    setPassword("");
    setPendingAction(null);
  }

  function exportCSV() {
    const headers = [
      "Contractor",
      "Project",
      "Bill No",
      "Slab No",
      "Footings",
      "R/W",
      "Columns",
      "Beams",
      "Slab",
      "OHT",
      "Total SFT",
      "Remarks",
    ];
    const rows = filtered.map((r) => [
      getContractorName(r.contractorId),
      getProjectName(r.projectId),
      r.billNo,
      r.slabNo,
      r.footings,
      r.rw,
      r.columns,
      r.beams,
      r.slab,
      r.oht,
      r.totalSft,
      r.remarks,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map(String).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "sft_entries.csv";
    a.click();
  }

  function downloadFormat() {
    const headers = [
      "Contractor ID",
      "Project ID",
      "Bill No",
      "Slab No",
      "Footings",
      "R/W",
      "Columns",
      "Beams",
      "Slab",
      "OHT",
      "Remarks",
    ];
    const csv = headers.join(",");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "sft_format.csv";
    a.click();
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = filtered
      .map(
        (r) =>
          `<tr style="background:${filtered.indexOf(r) % 2 === 0 ? "#E3F2FD" : "#fff"}">
        <td style="padding:4px 8px">${getContractorName(r.contractorId)}</td>
        <td style="padding:4px 8px">${r.billNo}</td>
        <td style="padding:4px 8px">${r.slabNo}</td>
        <td style="padding:4px 8px">${getProjectName(r.projectId)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.footings)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.rw)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.columns)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.beams)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.slab)}</td>
        <td style="padding:4px 8px;text-align:right">${fmt(r.oht)}</td>
        <td style="padding:4px 8px;text-align:right;font-weight:700;color:#0078D7">${fmt(r.totalSft)}</td>
      </tr>`,
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SFT Report</title><style>
      body{font-family:'Century Gothic',Arial,sans-serif;margin:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#0078D7;color:#fff;padding:6px 8px;text-align:left}
      td{border-bottom:1px solid #e0e0e0}
      .footer{text-align:center;font-size:10px;color:#888;margin-top:12px}
    </style></head><body>
      <h2 style="color:#0078D7">ClearPay – SFT Report</h2>
      <p style="font-size:12px;color:#555">Total SFT: <strong>${fmt(totalSftSum)}</strong></p>
      <table><thead><tr>
        <th>Contractor</th><th>Bill No</th><th>Slab No</th><th>Project</th>
        <th>Footings</th><th>R/W</th><th>Columns</th><th>Beams</th><th>Slab</th><th>OHT</th><th>Total SFT</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">© 2025 ClearPay. Powered by Seri AI.</div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const numFields = [
    { key: "footings", label: "Footings" },
    { key: "rw", label: "R/W" },
    { key: "columns", label: "Columns" },
    { key: "beams", label: "Beams" },
    { key: "slab", label: "Slab" },
    { key: "oht", label: "OHT" },
  ];

  const thStyle = {
    ...fontStyle,
    background: "#0078D7",
    color: "#fff",
    padding: "8px 10px",
    whiteSpace: "nowrap" as const,
    cursor: "pointer",
    userSelect: "none" as const,
  };

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  return (
    <div style={{ ...fontStyle, padding: "0" }}>
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "2px solid #0078D7",
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: "#0078D7",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "5px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: "#555",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "5px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FileText size={14} /> PDF
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv";
                  input.onchange = () =>
                    toast.info("CSV import not yet wired to backend");
                  input.click();
                }}
                style={{
                  background: "#28A745",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Upload size={14} /> Import CSV
              </button>
              <button
                type="button"
                onClick={downloadFormat}
                style={{
                  background: "#FFA500",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Download size={14} /> Format
              </button>
            </>
          )}
          <button
            type="button"
            onClick={exportCSV}
            style={{
              background: "#17a2b8",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "5px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              style={{
                background: "#0078D7",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "5px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 700,
              }}
            >
              <Plus size={14} /> New
            </button>
          )}
          {isAdmin && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPendingAction({ type: "bulkDelete" });
                setPassword("");
                setShowPasswordModal(true);
              }}
              style={{
                background: "#FF0000",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "5px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Trash2 size={14} /> Bulk Delete ({selectedIds.length})
            </button>
          )}
          {/* Summary boxes */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <div
              style={{
                border: "1px solid #0078D7",
                borderRadius: 6,
                padding: "4px 12px",
                minWidth: 120,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#555" }}>Contractor</div>
              <div style={{ fontWeight: 700, color: "#0078D7", fontSize: 13 }}>
                {filterContractor ? getContractorName(filterContractor) : "—"}
              </div>
            </div>
            <div
              style={{
                border: "1px solid #28A745",
                borderRadius: 6,
                padding: "4px 12px",
                minWidth: 120,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#555" }}>Project</div>
              <div style={{ fontWeight: 700, color: "#28A745", fontSize: 13 }}>
                {filterProject ? getProjectName(filterProject) : "—"}
              </div>
            </div>
            <div
              style={{
                border: "1px solid #FFA500",
                borderRadius: 6,
                padding: "4px 14px",
                minWidth: 120,
                textAlign: "center",
                background: "#FFF8E1",
              }}
            >
              <div style={{ fontSize: 11, color: "#555" }}>Total SFT</div>
              <div style={{ fontWeight: 700, color: "#FFA500", fontSize: 14 }}>
                {fmt(totalSftSum)}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={filterContractor}
            onChange={(e) => setFilterContractor(e.target.value)}
            style={{
              ...fontStyle,
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 13,
            }}
          >
            <option value="">All Contractors</option>
            {(contractors as any[]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{
              ...fontStyle,
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 13,
            }}
          >
            <option value="">All Projects</option>
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(filterContractor || filterProject) && (
            <button
              type="button"
              onClick={() => {
                setFilterContractor("");
                setFilterProject("");
              }}
              style={{
                background: "#555",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X size={12} /> Clear
            </button>
          )}
          <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>
            Showing {filtered.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", padding: "0 0 16px" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {isAdmin && (
                <th style={{ ...thStyle, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? filtered.map((r) => r.id) : [],
                      )
                    }
                  />
                </th>
              )}
              {[
                { key: "contractorId", label: "Contractor" },
                { key: "billNo", label: "Bill No" },
                { key: "slabNo", label: "Slab No" },
                { key: "projectId", label: "Project" },
                { key: "footings", label: "Footings" },
                { key: "rw", label: "R/W" },
                { key: "columns", label: "Columns" },
                { key: "beams", label: "Beams" },
                { key: "slab", label: "Slab" },
                { key: "oht", label: "OHT" },
                { key: "totalSft", label: "Total SFT" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  style={thStyle}
                  onClick={() => handleSort(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSort(key);
                  }}
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 13 : 12}
                  style={{
                    textAlign: "center",
                    padding: 24,
                    color: "#888",
                    ...fontStyle,
                  }}
                >
                  No SFT entries found.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ background: idx % 2 === 0 ? "#E3F2FD" : "#fff" }}
                >
                  {isAdmin && (
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={(e) =>
                          setSelectedIds(
                            e.target.checked
                              ? [...selectedIds, r.id]
                              : selectedIds.filter((x) => x !== r.id),
                          )
                        }
                      />
                    </td>
                  )}
                  <td style={{ padding: "6px 10px" }}>
                    {getContractorName(r.contractorId)}
                  </td>
                  <td style={{ padding: "6px 10px" }}>{r.billNo}</td>
                  <td style={{ padding: "6px 10px" }}>{r.slabNo}</td>
                  <td style={{ padding: "6px 10px" }}>
                    {getProjectName(r.projectId)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.footings)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.rw)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.columns)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.beams)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.slab)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    {fmt(r.oht)}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0078D7",
                    }}
                  >
                    {fmt(r.totalSft)}
                  </td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => setViewRecord(r)}
                      style={{
                        background: "#0078D7",
                        color: "#fff",
                        border: "none",
                        borderRadius: 3,
                        padding: "3px 7px",
                        cursor: "pointer",
                        marginRight: 4,
                      }}
                      title="View"
                    >
                      <Eye size={12} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          style={{
                            background: "#FFA500",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            padding: "3px 7px",
                            cursor: "pointer",
                            marginRight: 4,
                          }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingAction({ type: "delete", data: r });
                            setPassword("");
                            setShowPasswordModal(true);
                          }}
                          style={{
                            background: "#D32F2F",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            padding: "3px 7px",
                            cursor: "pointer",
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New/Edit Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditRecord(null);
          }
        }}
      >
        <DialogContent
          style={{
            maxWidth: 540,
            ...fontStyle,
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <DialogHeader>
            <DialogTitle style={fontStyle}>
              {editRecord ? "Edit SFT Entry" : "New SFT Entry"}
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <Label style={fontStyle}>Contractor *</Label>
                <select
                  value={form.contractorId}
                  onChange={(e) => setField("contractorId", e.target.value)}
                  style={{
                    ...fontStyle,
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    padding: "6px 8px",
                    marginTop: 2,
                  }}
                >
                  <option value="">Select Contractor</option>
                  {activeContractors.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label style={fontStyle}>Project *</Label>
                <select
                  value={form.projectId}
                  onChange={(e) => setField("projectId", e.target.value)}
                  style={{
                    ...fontStyle,
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    padding: "6px 8px",
                    marginTop: 2,
                  }}
                >
                  <option value="">Select Project</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label style={fontStyle}>Bill No</Label>
                <Input
                  value={form.billNo}
                  onChange={(e) => setField("billNo", e.target.value)}
                  style={fontStyle}
                />
              </div>
              <div>
                <Label style={fontStyle}>Slab No</Label>
                <Input
                  value={form.slabNo}
                  onChange={(e) => setField("slabNo", e.target.value)}
                  style={fontStyle}
                />
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              {numFields.map(({ key, label }) => (
                <div key={key}>
                  <Label style={fontStyle}>{label}</Label>
                  <Input
                    type="number"
                    value={(form as any)[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    style={fontStyle}
                    min="0"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                background: "#E3F2FD",
                border: "1px solid #0078D7",
                borderRadius: 4,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 700, color: "#0078D7" }}>
                Total SFT (Auto)
              </span>
              <span style={{ fontWeight: 700, color: "#0078D7" }}>
                {fmt(totalSft)}
              </span>
            </div>
            <div>
              <Label style={fontStyle}>Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                style={fontStyle}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditRecord(null);
              }}
              style={fontStyle}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveForm}
              style={{ background: "#0078D7", color: "#fff", ...fontStyle }}
            >
              {editRecord ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewRecord && (
        <Dialog
          open={!!viewRecord}
          onOpenChange={(o) => {
            if (!o) setViewRecord(null);
          }}
        >
          <DialogContent style={{ maxWidth: 480, ...fontStyle }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: 0,
                  display: "flex",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    printReceiptSFT(
                      viewRecord,
                      getContractorName(viewRecord.contractorId),
                      getProjectName(viewRecord.projectId),
                    )
                  }
                  style={{
                    background: "#0078D7",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Print"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shareReceiptAsImage({
                      title: "SFT Receipt",
                      borderColor: "#0078D7",
                      rows: [
                        [
                          "Contractor",
                          getContractorName(viewRecord.contractorId),
                        ],
                        ["Project", getProjectName(viewRecord.projectId)],
                        ["Bill No", viewRecord.billNo],
                        ["Slab No", viewRecord.slabNo],
                        ["Footings", fmt(viewRecord.footings)],
                        ["R/W", fmt(viewRecord.rw)],
                        ["Columns", fmt(viewRecord.columns)],
                        ["Beams", fmt(viewRecord.beams)],
                        ["Slab", fmt(viewRecord.slab)],
                        ["OHT", fmt(viewRecord.oht)],
                        ["Total SFT", fmt(viewRecord.totalSft)],
                        ["Remarks", viewRecord.remarks],
                      ],
                      filename: "sft-receipt.png",
                    });
                  }}
                  style={{
                    background: "#555",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Share"
                >
                  <Share2 size={13} /> Share
                </button>
              </div>
              <div
                style={{
                  border: "3px solid #0078D7",
                  borderRadius: 6,
                  padding: "16px 14px",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#0078D7",
                    fontSize: 15,
                    marginBottom: 10,
                  }}
                >
                  SFT Details
                </div>
                <table
                  style={{
                    width: "100%",
                    fontSize: 13,
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    {[
                      [
                        "Contractor",
                        getContractorName(viewRecord.contractorId),
                      ],
                      ["Project", getProjectName(viewRecord.projectId)],
                      ["Bill No", viewRecord.billNo],
                      ["Slab No", viewRecord.slabNo],
                      ["Footings", `${fmt(viewRecord.footings)} SFT`],
                      ["R/W", `${fmt(viewRecord.rw)} SFT`],
                      ["Columns", `${fmt(viewRecord.columns)} SFT`],
                      ["Beams", `${fmt(viewRecord.beams)} SFT`],
                      ["Slab", `${fmt(viewRecord.slab)} SFT`],
                      ["OHT", `${fmt(viewRecord.oht)} SFT`],
                      ["Remarks", viewRecord.remarks],
                    ].map(([label, value], i) =>
                      value ? (
                        <tr
                          key={label}
                          style={{
                            background: i % 2 === 0 ? "#E3F2FD" : "#fff",
                          }}
                        >
                          <td
                            style={{
                              padding: "4px 8px",
                              fontWeight: 600,
                              color: "#555",
                              width: "40%",
                              borderBottom: "1px solid #e0e0e0",
                            }}
                          >
                            {label}
                          </td>
                          <td
                            style={{
                              padding: "4px 8px",
                              borderBottom: "1px solid #e0e0e0",
                            }}
                          >
                            {value}
                          </td>
                        </tr>
                      ) : null,
                    )}
                    <tr style={{ background: "#0078D7" }}>
                      <td
                        style={{
                          padding: "6px 8px",
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        Total SFT
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {fmt(viewRecord.totalSft)} SFT
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Password Confirmation */}
      <Dialog
        open={showPasswordModal}
        onOpenChange={(o) => {
          if (!o) {
            setShowPasswordModal(false);
            setPassword("");
          }
        }}
      >
        <DialogContent style={{ maxWidth: 340, ...fontStyle }}>
          <DialogHeader>
            <DialogTitle style={fontStyle}>Admin Password Required</DialogTitle>
          </DialogHeader>
          <div>
            <Label style={fontStyle}>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={fontStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePasswordConfirm();
              }}
            />
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setPassword("");
              }}
              style={fontStyle}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordConfirm}
              style={{ background: "#0078D7", color: "#fff", ...fontStyle }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
