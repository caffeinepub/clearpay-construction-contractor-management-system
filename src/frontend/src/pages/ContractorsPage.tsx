import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import {
  useGetAllProjects,
  useGetCallerUserProfile,
} from "../hooks/useQueries";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContractorRecord = {
  id: string;
  name: string;
  trades: string[];
  projectId: string;
  date: string;
  contractingPrice: number;
  unit: string;
  contact1: string;
  contact2: string;
  email: string;
  address: string;
  link1: string;
  link2: string;
  note: string;
};

type ContractorBillRecord = {
  id: string;
  contractorId: string;
  projectId: string;
  billNo: string;
  date: string;
  item: string;
  area: number;
  unit: string;
  unitPrice: number;
  amount: number;
  remarks: string;
};

type ContractorPaymentRecord = {
  id: string;
  contractorId: string;
  projectId: string;
  paymentNo: string;
  date: string;
  amount: number;
  paymentMode: string;
  remarks: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TRADES = [
  "NMR",
  "Form work",
  "Bar bending",
  "Scaffolding",
  "Buffing",
  "Mason",
];
const UNITS = ["Rft", "Sft", "Cft", "Rmtr", "Smtr", "Cumtr", "Lumsum"];

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const ZEBRA_CONTRACTOR = "#E8F5E9";
const ZEBRA_BILL = "#FFEBEE";
const ZEBRA_PAYMENT = "#E8F5E9";

// ─── Password Confirm Modal ───────────────────────────────────────────────────
function PasswordModal({
  open,
  onConfirm,
  onCancel,
  title = "Confirm Action",
}: {
  open: boolean;
  onConfirm: (pwd: string) => void;
  onCancel: () => void;
  title?: string;
}) {
  const [pwd, setPwd] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-sm" data-ocid="contractors.dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-sm mb-1 block">Password</Label>
          <Input
            type="password"
            placeholder="Enter admin password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            data-ocid="contractors.input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm(pwd);
                setPwd("");
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              setPwd("");
            }}
            data-ocid="contractors.cancel_button"
          >
            Cancel
          </Button>
          <Button
            style={{ background: "#0078D7", color: "#fff" }}
            onClick={() => {
              onConfirm(pwd);
              setPwd("");
            }}
            data-ocid="contractors.confirm_button"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContractorsPage() {
  const { actor } = useActor();
  const { isMasterAdmin } = useMasterAdmin();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: projects = [] } = useGetAllProjects();
  const queryClient = useQueryClient();

  const canManage = isMasterAdmin || userProfile?.role === "admin";

  // ── Data queries ──
  const { data: contractors = [], refetch: refetchContractors } = useQuery<
    ContractorRecord[]
  >({
    queryKey: ["contractorsList"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).listContractors();
      } catch {
        return [];
      }
    },
    enabled: !!actor,
    staleTime: 30000,
  });

  const { data: cBills = [], refetch: refetchCBills } = useQuery<
    ContractorBillRecord[]
  >({
    queryKey: ["contractorBillsList"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).listContractorBills();
      } catch {
        return [];
      }
    },
    enabled: !!actor,
    staleTime: 30000,
  });

  const { data: cPayments = [], refetch: refetchCPayments } = useQuery<
    ContractorPaymentRecord[]
  >({
    queryKey: ["contractorPaymentsList"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).listContractorPayments();
      } catch {
        return [];
      }
    },
    enabled: !!actor,
    staleTime: 30000,
  });

  const _refetchAll = () => {
    refetchContractors();
    refetchCBills();
    refetchCPayments();
  };

  // ── Contractor tab state ──
  const [cFilter, setCFilter] = useState({
    name: "",
    project: "",
    trade: "",
    dateFrom: "",
    dateTo: "",
  });
  const [cSelected, setCSelected] = useState<string[]>([]);
  const [cFormOpen, setCFormOpen] = useState(false);
  const [cViewOpen, setCViewOpen] = useState(false);
  const [cViewItem, setCViewItem] = useState<ContractorRecord | null>(null);
  const [cEditing, setCEditing] = useState<ContractorRecord | null>(null);
  const [cPwdAction, setCPwdAction] = useState<null | {
    type: "edit" | "delete" | "bulk";
    ids?: string[];
    data?: ContractorRecord;
  }>(null);
  const [cForm, setCForm] = useState<Omit<ContractorRecord, "id">>({
    name: "",
    trades: [],
    projectId: "",
    date: "",
    contractingPrice: 0,
    unit: "Sft",
    contact1: "",
    contact2: "",
    email: "",
    address: "",
    link1: "",
    link2: "",
    note: "",
  });

  // ── Bill tab state ──
  const [bFilter, setBFilter] = useState({
    contractorId: "",
    projectId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [bSelected, setBSelected] = useState<string[]>([]);
  const [bFormOpen, setBFormOpen] = useState(false);
  const [bViewOpen, setBViewOpen] = useState(false);
  const [bViewItem, setBViewItem] = useState<ContractorBillRecord | null>(null);
  const [bEditing, setBEditing] = useState<ContractorBillRecord | null>(null);
  const [bPwdAction, setBPwdAction] = useState<null | {
    type: "edit" | "delete" | "bulk";
    ids?: string[];
    data?: ContractorBillRecord;
  }>(null);
  const [bForm, setBForm] = useState<
    Omit<ContractorBillRecord, "id" | "amount">
  >({
    contractorId: "",
    projectId: "",
    billNo: "",
    date: "",
    item: "",
    area: 0,
    unit: "Sft",
    unitPrice: 0,
    remarks: "",
  });

  // ── Payment tab state ──
  const [pFilter, setPFilter] = useState({
    contractorId: "",
    projectId: "",
    paymentMode: "",
    dateFrom: "",
    dateTo: "",
  });
  const [pSelected, setPSelected] = useState<string[]>([]);
  const [pFormOpen, setPFormOpen] = useState(false);
  const [pViewOpen, setPViewOpen] = useState(false);
  const [pViewItem, setPViewItem] = useState<ContractorPaymentRecord | null>(
    null,
  );
  const [pEditing, setPEditing] = useState<ContractorPaymentRecord | null>(
    null,
  );
  const [pPwdAction, setPPwdAction] = useState<null | {
    type: "edit" | "delete" | "bulk";
    ids?: string[];
    data?: ContractorPaymentRecord;
  }>(null);
  const [pForm, setPForm] = useState<Omit<ContractorPaymentRecord, "id">>({
    contractorId: "",
    projectId: "",
    paymentNo: "",
    date: "",
    amount: 0,
    paymentMode: "Account",
    remarks: "",
  });

  // ── Report tab state ──
  const [rFilter, setRFilter] = useState({
    contractorId: "",
    projectId: "",
    dateFrom: "",
    dateTo: "",
  });

  // ── Filtered lists ──
  const filteredContractors = useMemo(
    () =>
      contractors.filter((c) => {
        if (
          cFilter.name &&
          !c.name.toLowerCase().includes(cFilter.name.toLowerCase())
        )
          return false;
        if (cFilter.project && c.projectId !== cFilter.project) return false;
        if (cFilter.trade && !c.trades.includes(cFilter.trade)) return false;
        if (cFilter.dateFrom && c.date < cFilter.dateFrom) return false;
        if (cFilter.dateTo && c.date > cFilter.dateTo) return false;
        return true;
      }),
    [contractors, cFilter],
  );

  const filteredBills = useMemo(
    () =>
      cBills.filter((b) => {
        if (bFilter.contractorId && b.contractorId !== bFilter.contractorId)
          return false;
        if (bFilter.projectId && b.projectId !== bFilter.projectId)
          return false;
        if (bFilter.dateFrom && b.date < bFilter.dateFrom) return false;
        if (bFilter.dateTo && b.date > bFilter.dateTo) return false;
        return true;
      }),
    [cBills, bFilter],
  );

  const filteredPayments = useMemo(
    () =>
      cPayments.filter((p) => {
        if (pFilter.contractorId && p.contractorId !== pFilter.contractorId)
          return false;
        if (pFilter.projectId && p.projectId !== pFilter.projectId)
          return false;
        if (pFilter.paymentMode && p.paymentMode !== pFilter.paymentMode)
          return false;
        if (pFilter.dateFrom && p.date < pFilter.dateFrom) return false;
        if (pFilter.dateTo && p.date > pFilter.dateTo) return false;
        return true;
      }),
    [cPayments, pFilter],
  );

  const rFilteredBills = useMemo(
    () =>
      cBills.filter((b) => {
        if (rFilter.contractorId && b.contractorId !== rFilter.contractorId)
          return false;
        if (rFilter.projectId && b.projectId !== rFilter.projectId)
          return false;
        if (rFilter.dateFrom && b.date < rFilter.dateFrom) return false;
        if (rFilter.dateTo && b.date > rFilter.dateTo) return false;
        return true;
      }),
    [cBills, rFilter],
  );

  const rFilteredPayments = useMemo(
    () =>
      cPayments.filter((p) => {
        if (rFilter.contractorId && p.contractorId !== rFilter.contractorId)
          return false;
        if (rFilter.projectId && p.projectId !== rFilter.projectId)
          return false;
        if (rFilter.dateFrom && p.date < rFilter.dateFrom) return false;
        if (rFilter.dateTo && p.date > rFilter.dateTo) return false;
        return true;
      }),
    [cPayments, rFilter],
  );

  // ── Helpers ──
  const getContractorName = (id: string) =>
    contractors.find((c) => c.id === id)?.name || id;
  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id;

  // ── Contractor CRUD ──
  const openAddContractor = () => {
    setCEditing(null);
    setCForm({
      name: "",
      trades: [],
      projectId: "",
      date: "",
      contractingPrice: 0,
      unit: "Sft",
      contact1: "",
      contact2: "",
      email: "",
      address: "",
      link1: "",
      link2: "",
      note: "",
    });
    setCFormOpen(true);
  };

  const openEditContractor = (c: ContractorRecord) => {
    setCPwdAction({ type: "edit", data: c });
  };

  const handleContractorEditPwd = async (pwd: string) => {
    const c = cPwdAction?.data as ContractorRecord;
    setCPwdAction(null);
    setCEditing(c);
    setCForm({
      name: c.name,
      trades: c.trades,
      projectId: c.projectId,
      date: c.date,
      contractingPrice: c.contractingPrice,
      unit: c.unit,
      contact1: c.contact1,
      contact2: c.contact2,
      email: c.email,
      address: c.address,
      link1: c.link1,
      link2: c.link2,
      note: c.note,
    });
    setCFormOpen(true);
    return pwd; // password will be used on save
  };

  const [cEditPwd, setCEditPwd] = useState("");

  const saveContractor = async () => {
    if (!cForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (cEditing) {
        await (actor as any).updateContractor(
          cEditing.id,
          cForm.name,
          cForm.trades,
          cForm.projectId,
          cForm.date,
          cForm.contractingPrice,
          cForm.unit,
          cForm.contact1,
          cForm.contact2,
          cForm.email,
          cForm.address,
          cForm.link1,
          cForm.link2,
          cForm.note,
          cEditPwd,
        );
        toast.success("Contractor updated");
      } else {
        await (actor as any).addContractor(
          cForm.name,
          cForm.trades,
          cForm.projectId,
          cForm.date,
          cForm.contractingPrice,
          cForm.unit,
          cForm.contact1,
          cForm.contact2,
          cForm.email,
          cForm.address,
          cForm.link1,
          cForm.link2,
          cForm.note,
        );
        toast.success("Contractor added");
      }
      setCFormOpen(false);
      setCEditing(null);
      setCEditPwd("");
      queryClient.invalidateQueries({ queryKey: ["contractorsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save contractor");
    }
  };

  const deleteContractor = async (id: string, pwd: string) => {
    try {
      await (actor as any).deleteContractors([id], pwd);
      toast.success("Contractor deleted");
      setCSelected((prev) => prev.filter((x) => x !== id));
      queryClient.invalidateQueries({ queryKey: ["contractorsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const bulkDeleteContractors = async (pwd: string) => {
    const ids = cPwdAction?.ids || cSelected;
    try {
      await (actor as any).deleteContractors(ids, pwd);
      toast.success(`Deleted ${ids.length} contractors`);
      setCSelected([]);
      queryClient.invalidateQueries({ queryKey: ["contractorsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to bulk delete");
    }
  };

  // ── Bill CRUD ──
  const openAddBill = () => {
    setBEditing(null);
    setBForm({
      contractorId: "",
      projectId: "",
      billNo: "",
      date: "",
      item: "",
      area: 0,
      unit: "Sft",
      unitPrice: 0,
      remarks: "",
    });
    setBFormOpen(true);
  };

  const saveBill = async () => {
    if (!bForm.billNo.trim()) {
      toast.error("Bill No is required");
      return;
    }
    const dup = cBills.find(
      (b) =>
        b.contractorId === bForm.contractorId &&
        b.billNo === bForm.billNo &&
        (!bEditing || b.id !== bEditing.id),
    );
    if (dup) {
      toast.error("This bill number already entered for this contractor.");
      return;
    }
    const amount = bForm.area * bForm.unitPrice;
    try {
      if (bEditing) {
        await (actor as any).updateContractorBill(
          bEditing.id,
          bForm.contractorId,
          bForm.projectId,
          bForm.billNo,
          bForm.date,
          bForm.item,
          bForm.area,
          bForm.unit,
          bForm.unitPrice,
          bForm.remarks,
          "",
        );
        toast.success("Bill updated");
      } else {
        await (actor as any).addContractorBill(
          bForm.contractorId,
          bForm.projectId,
          bForm.billNo,
          bForm.date,
          bForm.item,
          bForm.area,
          bForm.unit,
          bForm.unitPrice,
          bForm.remarks,
        );
        toast.success("Bill added");
      }
      setBFormOpen(false);
      setBEditing(null);
      queryClient.invalidateQueries({ queryKey: ["contractorBillsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save bill");
    }
    // keep amount in scope to avoid unused warning
    void amount;
  };

  const deleteBill = async (id: string, pwd: string) => {
    try {
      await (actor as any).deleteContractorBills([id], pwd);
      toast.success("Bill deleted");
      setBSelected((prev) => prev.filter((x) => x !== id));
      queryClient.invalidateQueries({ queryKey: ["contractorBillsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const bulkDeleteBills = async (pwd: string) => {
    try {
      await (actor as any).deleteContractorBills(bSelected, pwd);
      toast.success(`Deleted ${bSelected.length} bills`);
      setBSelected([]);
      queryClient.invalidateQueries({ queryKey: ["contractorBillsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to bulk delete");
    }
  };

  // ── Payment CRUD ──
  const openAddPayment = () => {
    setPEditing(null);
    setPForm({
      contractorId: "",
      projectId: "",
      paymentNo: "",
      date: "",
      amount: 0,
      paymentMode: "Account",
      remarks: "",
    });
    setPFormOpen(true);
  };

  const savePayment = async () => {
    try {
      if (pEditing) {
        await (actor as any).updateContractorPayment(
          pEditing.id,
          pForm.contractorId,
          pForm.projectId,
          pForm.paymentNo,
          pForm.date,
          pForm.amount,
          pForm.paymentMode,
          pForm.remarks,
          "",
        );
        toast.success("Payment updated");
      } else {
        await (actor as any).addContractorPayment(
          pForm.contractorId,
          pForm.projectId,
          pForm.paymentNo,
          pForm.date,
          pForm.amount,
          pForm.paymentMode,
          pForm.remarks,
        );
        toast.success("Payment added");
      }
      setPFormOpen(false);
      setPEditing(null);
      queryClient.invalidateQueries({ queryKey: ["contractorPaymentsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save payment");
    }
  };

  const deletePayment = async (id: string, pwd: string) => {
    try {
      await (actor as any).deleteContractorPayments([id], pwd);
      toast.success("Payment deleted");
      setPSelected((prev) => prev.filter((x) => x !== id));
      queryClient.invalidateQueries({ queryKey: ["contractorPaymentsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const bulkDeletePayments = async (pwd: string) => {
    try {
      await (actor as any).deleteContractorPayments(pSelected, pwd);
      toast.success(`Deleted ${pSelected.length} payments`);
      setPSelected([]);
      queryClient.invalidateQueries({ queryKey: ["contractorPaymentsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to bulk delete");
    }
  };

  // ── Export / Print helpers ──
  const exportCSV = (rows: any[], headers: string[], filename: string) => {
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = filename;
    a.click();
  };

  const downloadFormat = (headers: string[], filename: string) => {
    const csv = `${headers.join(",")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = filename;
    a.click();
  };

  const printContent = (html: string) => {
    const w = window.open("", "_blank")!;
    w.document.write(
      `<html><head><title>ClearPay Report</title><style>body{font-family:'Century Gothic',Arial,sans-serif;font-size:13px;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#0078D7;color:#fff}.summary{display:flex;gap:16px;margin-bottom:16px}.s-card{background:#f0f8ff;border:1px solid #0078D7;border-radius:6px;padding:10px 16px;min-width:150px}.s-card h4{margin:0 0 4px;font-size:11px;color:#555}.s-card p{margin:0;font-size:15px;font-weight:bold;color:#0078D7}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const importCSV = (
    file: File,
    onRow: (row: Record<string, string>) => void,
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/^"|"$/g, "").trim());
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i]
          .split(",")
          .map((v) => v.replace(/^"|"$/g, "").trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx] || "";
        });
        onRow(row);
      }
    };
    reader.readAsText(file);
  };

  const cImportRef = useRef<HTMLInputElement>(null);
  const bImportRef = useRef<HTMLInputElement>(null);
  const pImportRef = useRef<HTMLInputElement>(null);

  // ── Ledger ──
  const ledgerEntries = useMemo(() => {
    const entries: {
      date: string;
      contractorId: string;
      projectId: string;
      desc: string;
      debit: number;
      credit: number;
    }[] = [
      ...rFilteredBills.map((b) => ({
        date: b.date,
        contractorId: b.contractorId,
        projectId: b.projectId,
        desc: `Bill #${b.billNo} – ${b.item}`,
        debit: b.amount,
        credit: 0,
      })),
      ...rFilteredPayments.map((p) => ({
        date: p.date,
        contractorId: p.contractorId,
        projectId: p.projectId,
        desc: `Payment #${p.paymentNo} (${p.paymentMode})`,
        debit: 0,
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }, [rFilteredBills, rFilteredPayments]);

  const totalBillsAmt = useMemo(
    () => filteredBills.reduce((s, b) => s + b.amount, 0),
    [filteredBills],
  );
  const totalPaymentsAmt = useMemo(
    () => filteredPayments.reduce((s, p) => s + p.amount, 0),
    [filteredPayments],
  );
  const rTotalBills = useMemo(
    () => rFilteredBills.reduce((s, b) => s + b.amount, 0),
    [rFilteredBills],
  );
  const rTotalPayments = useMemo(
    () => rFilteredPayments.reduce((s, p) => s + p.amount, 0),
    [rFilteredPayments],
  );

  // ── Style helpers ──
  const ribbonBtn = (color = "#0078D7"): React.CSSProperties => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: "'Century Gothic',Arial,sans-serif",
  });

  const actionBtn = (color: string): React.CSSProperties => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  });

  const filterStyle: React.CSSProperties = {
    padding: "4px 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "'Century Gothic',Arial,sans-serif",
  };

  const thStyle: React.CSSProperties = {
    background: "#0078D7",
    color: "#fff",
    padding: "8px 10px",
    fontFamily: "'Century Gothic',Arial,sans-serif",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    textAlign: "left",
    fontSize: "12px",
    whiteSpace: "nowrap",
  };

  const tdStyle = (even: boolean, negative = false): React.CSSProperties => ({
    padding: "6px 10px",
    fontSize: "12px",
    background: negative ? "#FFF9C4" : even ? ZEBRA_CONTRACTOR : "#fff",
    color: negative ? "#D32F2F" : "#333",
    fontFamily: "'Century Gothic',Arial,sans-serif",
    borderBottom: "1px solid #e0e0e0",
  });

  const sectionHeader: React.CSSProperties = {
    background: "#fff",
    padding: "12px 20px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };

  return (
    <div
      style={{
        fontFamily: "'Century Gothic',Arial,sans-serif",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Tabs
        defaultValue="contractors"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderBottom: "2px solid #0078D7",
            padding: "0 20px",
          }}
        >
          <TabsList style={{ background: "transparent", gap: "4px" }}>
            {["contractors", "bills", "payments", "reports"].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                data-ocid={`contractors.${t}.tab`}
                style={{
                  textTransform: "capitalize",
                  fontFamily: "'Century Gothic',Arial,sans-serif",
                  fontWeight: 600,
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ════════════════════════════ CONTRACTORS TAB ════════════════════════════ */}
        <TabsContent
          value="contractors"
          style={{ flex: 1, overflow: "auto", margin: 0 }}
        >
          {/* Ribbon */}
          <div style={{ ...sectionHeader, gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {canManage && (
                <>
                  <button
                    type="button"
                    style={ribbonBtn()}
                    onClick={() => window.print()}
                    title="Print"
                    data-ocid="contractors.print_button"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() => {
                      const html = `<h2>Contractors List</h2><table><thead><tr><th>#</th><th>Name</th><th>Trades</th><th>Project</th><th>Date</th><th>Price</th><th>Unit</th><th>Contact</th></tr></thead><tbody>${filteredContractors.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.trades.join(", ")}</td><td>${getProjectName(c.projectId)}</td><td>${c.date}</td><td>${fmtINR(c.contractingPrice)}</td><td>${c.unit}</td><td>${c.contact1}</td></tr>`).join("")}</tbody></table>`;
                      printContent(html);
                    }}
                    title="Export PDF"
                    data-ocid="contractors.secondary_button"
                  >
                    <FileText size={13} />
                    PDF
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#28A745")}
                    onClick={() => cImportRef.current?.click()}
                    title="Import CSV"
                    data-ocid="contractors.upload_button"
                  >
                    <Upload size={13} />
                    Import CSV
                  </button>
                  <input
                    ref={cImportRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      importCSV(f, async (row) => {
                        try {
                          await (actor as any).addContractor(
                            row.Name || "",
                            (row.Trades || "").split("|"),
                            row.ProjectId || "",
                            row.Date || "",
                            Number(row.ContractingPrice || 0),
                            row.Unit || "Sft",
                            row.Contact1 || "",
                            row.Contact2 || "",
                            row.Email || "",
                            row.Address || "",
                            row.Link1 || "",
                            row.Link2 || "",
                            row.Note || "",
                          );
                        } catch {}
                      });
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["contractorsList"],
                        });
                        e.target.value = "";
                      }, 1500);
                    }}
                  />
                  <button
                    type="button"
                    style={ribbonBtn("#FFA500")}
                    onClick={() =>
                      exportCSV(
                        filteredContractors,
                        [
                          "id",
                          "name",
                          "trades",
                          "projectId",
                          "date",
                          "contractingPrice",
                          "unit",
                          "contact1",
                          "contact2",
                          "email",
                          "address",
                          "link1",
                          "link2",
                          "note",
                        ],
                        "contractors.csv",
                      )
                    }
                    title="Export CSV"
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      downloadFormat(
                        [
                          "Name",
                          "Trades",
                          "ProjectId",
                          "Date",
                          "ContractingPrice",
                          "Unit",
                          "Contact1",
                          "Contact2",
                          "Email",
                          "Address",
                          "Link1",
                          "Link2",
                          "Note",
                        ],
                        "contractors-format.csv",
                      )
                    }
                    title="Download Format"
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Format
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#0078D7")}
                    onClick={openAddContractor}
                    data-ocid="contractors.primary_button"
                  >
                    <Plus size={13} />
                    New Contractor
                  </button>
                  {cSelected.length > 0 && (
                    <button
                      type="button"
                      style={ribbonBtn("#FF0000")}
                      onClick={() =>
                        setCPwdAction({ type: "bulk", ids: cSelected })
                      }
                      data-ocid="contractors.delete_button"
                    >
                      <Trash2 size={13} />
                      Bulk Delete ({cSelected.length})
                    </button>
                  )}
                </>
              )}
            </div>
            <div
              style={{
                background: "#E3F2FD",
                border: "1px solid #0078D7",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0078D7",
                whiteSpace: "nowrap",
              }}
            >
              Total: {filteredContractors.length} Contractors
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "10px 20px",
              background: "#f9f9f9",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              style={filterStyle}
              placeholder="Search name..."
              value={cFilter.name}
              onChange={(e) =>
                setCFilter((f) => ({ ...f, name: e.target.value }))
              }
              data-ocid="contractors.search_input"
            />
            <select
              style={filterStyle}
              value={cFilter.project}
              onChange={(e) =>
                setCFilter((f) => ({ ...f, project: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              style={filterStyle}
              value={cFilter.trade}
              onChange={(e) =>
                setCFilter((f) => ({ ...f, trade: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Trades</option>
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              style={filterStyle}
              value={cFilter.dateFrom}
              onChange={(e) =>
                setCFilter((f) => ({ ...f, dateFrom: e.target.value }))
              }
              data-ocid="contractors.input"
            />
            <input
              type="date"
              style={filterStyle}
              value={cFilter.dateTo}
              onChange={(e) =>
                setCFilter((f) => ({ ...f, dateTo: e.target.value }))
              }
              data-ocid="contractors.input"
            />
            <button
              type="button"
              style={{ ...ribbonBtn("#555"), fontSize: "11px" }}
              onClick={() =>
                setCFilter({
                  name: "",
                  project: "",
                  trade: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
              data-ocid="contractors.secondary_button"
            >
              Clear
            </button>
            <span style={{ fontSize: "11px", color: "#777" }}>
              Showing {filteredContractors.length} of {contractors.length}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {canManage && (
                    <th style={{ ...thStyle, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={
                          cSelected.length === filteredContractors.length &&
                          filteredContractors.length > 0
                        }
                        onChange={(e) =>
                          setCSelected(
                            e.target.checked
                              ? filteredContractors.map((c) => c.id)
                              : [],
                          )
                        }
                      />
                    </th>
                  )}
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Trade(s)</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Price (INR)</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#aaa",
                      }}
                      data-ocid="contractors.empty_state"
                    >
                      No contractors found.
                    </td>
                  </tr>
                ) : (
                  filteredContractors.map((c, i) => (
                    <tr key={c.id} data-ocid={`contractors.item.${i + 1}`}>
                      {canManage && (
                        <td style={tdStyle(i % 2 === 0)}>
                          <input
                            type="checkbox"
                            checked={cSelected.includes(c.id)}
                            onChange={(e) =>
                              setCSelected((prev) =>
                                e.target.checked
                                  ? [...prev, c.id]
                                  : prev.filter((x) => x !== c.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td style={tdStyle(i % 2 === 0)}>{i + 1}</td>
                      <td style={{ ...tdStyle(i % 2 === 0), fontWeight: 600 }}>
                        {c.name}
                      </td>
                      <td style={tdStyle(i % 2 === 0)}>
                        {c.trades.join(", ")}
                      </td>
                      <td style={tdStyle(i % 2 === 0)}>
                        {getProjectName(c.projectId)}
                      </td>
                      <td style={tdStyle(i % 2 === 0)}>{c.date}</td>
                      <td style={tdStyle(i % 2 === 0)}>
                        {fmtINR(c.contractingPrice)}
                      </td>
                      <td style={tdStyle(i % 2 === 0)}>{c.unit}</td>
                      <td style={tdStyle(i % 2 === 0)}>{c.contact1}</td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            style={actionBtn("#0078D7")}
                            onClick={() => {
                              setCViewItem(c);
                              setCViewOpen(true);
                            }}
                            title="View"
                            data-ocid={`contractors.edit_button.${i + 1}`}
                          >
                            <Eye size={12} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                style={actionBtn("#FFA500")}
                                onClick={() => openEditContractor(c)}
                                title="Edit"
                                data-ocid={`contractors.edit_button.${i + 1}`}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                style={actionBtn("#D32F2F")}
                                onClick={() =>
                                  setCPwdAction({ type: "delete", ids: [c.id] })
                                }
                                title="Delete"
                                data-ocid={`contractors.delete_button.${i + 1}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ════════════════════════════ BILLS TAB ════════════════════════════ */}
        <TabsContent
          value="bills"
          style={{ flex: 1, overflow: "auto", margin: 0 }}
        >
          <div style={{ ...sectionHeader, gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {canManage && (
                <>
                  <button
                    type="button"
                    style={ribbonBtn()}
                    onClick={() =>
                      printContent(
                        `<h2>Contractor Bills</h2><p>Total: ${fmtINR(totalBillsAmt)}</p><table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Bill No</th><th>Date</th><th>Item</th><th>Area</th><th>Unit</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${filteredBills.map((b, i) => `<tr><td>${i + 1}</td><td>${getContractorName(b.contractorId)}</td><td>${getProjectName(b.projectId)}</td><td>${b.billNo}</td><td>${b.date}</td><td>${b.item}</td><td>${b.area}</td><td>${b.unit}</td><td>${fmtINR(b.unitPrice)}</td><td>${fmtINR(b.amount)}</td></tr>`).join("")}</tbody></table>`,
                      )
                    }
                    title="Print"
                    data-ocid="contractors.print_button"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      printContent(
                        `<h2>Contractor Bills – PDF</h2><div class='summary'><div class='s-card'><h4>Total Bills</h4><p>${fmtINR(totalBillsAmt)}</p></div></div><table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Bill No</th><th>Date</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>${filteredBills.map((b, i) => `<tr><td>${i + 1}</td><td>${getContractorName(b.contractorId)}</td><td>${getProjectName(b.projectId)}</td><td>${b.billNo}</td><td>${b.date}</td><td>${fmtINR(b.amount)}</td><td>${b.remarks}</td></tr>`).join("")}</tbody></table>`,
                      )
                    }
                    title="PDF"
                    data-ocid="contractors.secondary_button"
                  >
                    <FileText size={13} />
                    PDF
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#28A745")}
                    onClick={() => bImportRef.current?.click()}
                    title="Import CSV"
                    data-ocid="contractors.upload_button"
                  >
                    <Upload size={13} />
                    Import CSV
                  </button>
                  <input
                    ref={bImportRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      importCSV(f, async (row) => {
                        try {
                          await (actor as any).addContractorBill(
                            row.ContractorId || "",
                            row.ProjectId || "",
                            row.BillNo || "",
                            row.Date || "",
                            row.Item || "",
                            Number(row.Area || 0),
                            row.Unit || "Sft",
                            Number(row.UnitPrice || 0),
                            row.Remarks || "",
                          );
                        } catch {}
                      });
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["contractorBillsList"],
                        });
                        e.target.value = "";
                      }, 1500);
                    }}
                  />
                  <button
                    type="button"
                    style={ribbonBtn("#FFA500")}
                    onClick={() =>
                      exportCSV(
                        filteredBills,
                        [
                          "id",
                          "contractorId",
                          "projectId",
                          "billNo",
                          "date",
                          "item",
                          "area",
                          "unit",
                          "unitPrice",
                          "amount",
                          "remarks",
                        ],
                        "contractor-bills.csv",
                      )
                    }
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      downloadFormat(
                        [
                          "ContractorId",
                          "ProjectId",
                          "BillNo",
                          "Date",
                          "Item",
                          "Area",
                          "Unit",
                          "UnitPrice",
                          "Remarks",
                        ],
                        "contractor-bills-format.csv",
                      )
                    }
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Format
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#0078D7")}
                    onClick={openAddBill}
                    data-ocid="contractors.primary_button"
                  >
                    <Plus size={13} />
                    New Bill
                  </button>
                  {bSelected.length > 0 && (
                    <button
                      type="button"
                      style={ribbonBtn("#FF0000")}
                      onClick={() => setBPwdAction({ type: "bulk" })}
                      data-ocid="contractors.delete_button"
                    >
                      <Trash2 size={13} />
                      Bulk Delete ({bSelected.length})
                    </button>
                  )}
                </>
              )}
            </div>
            <div
              style={{
                background: "#FFEBEE",
                border: "1px solid #D32F2F",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#D32F2F",
                whiteSpace: "nowrap",
              }}
            >
              Total Bills: {fmtINR(totalBillsAmt)}
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "10px 20px",
              background: "#f9f9f9",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={filterStyle}
              value={bFilter.contractorId}
              onChange={(e) =>
                setBFilter((f) => ({ ...f, contractorId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              style={filterStyle}
              value={bFilter.projectId}
              onChange={(e) =>
                setBFilter((f) => ({ ...f, projectId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              style={filterStyle}
              value={bFilter.dateFrom}
              onChange={(e) =>
                setBFilter((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
            <input
              type="date"
              style={filterStyle}
              value={bFilter.dateTo}
              onChange={(e) =>
                setBFilter((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
            <button
              type="button"
              style={{ ...ribbonBtn("#555"), fontSize: "11px" }}
              onClick={() =>
                setBFilter({
                  contractorId: "",
                  projectId: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
              data-ocid="contractors.secondary_button"
            >
              Clear
            </button>
            <span style={{ fontSize: "11px", color: "#777" }}>
              Showing {filteredBills.length} of {cBills.length}
            </span>
          </div>

          {/* Bills Table */}
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {canManage && (
                    <th
                      style={{ ...thStyle, background: "#D32F2F", width: 36 }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          bSelected.length === filteredBills.length &&
                          filteredBills.length > 0
                        }
                        onChange={(e) =>
                          setBSelected(
                            e.target.checked
                              ? filteredBills.map((b) => b.id)
                              : [],
                          )
                        }
                      />
                    </th>
                  )}
                  <th style={{ ...thStyle, background: "#D32F2F" }}>#</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>
                    Contractor
                  </th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Project</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Bill No</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Date</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Item</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Area</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Unit</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>
                    Unit Price
                  </th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>
                    Amount (INR)
                  </th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Remarks</th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#aaa",
                      }}
                      data-ocid="contractors.empty_state"
                    >
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b, i) => (
                    <tr key={b.id} data-ocid={`contractors.item.${i + 1}`}>
                      {canManage && (
                        <td
                          style={{
                            ...tdStyle(i % 2 === 0),
                            background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={bSelected.includes(b.id)}
                            onChange={(e) =>
                              setBSelected((prev) =>
                                e.target.checked
                                  ? [...prev, b.id]
                                  : prev.filter((x) => x !== b.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {getContractorName(b.contractorId)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {getProjectName(b.projectId)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.billNo}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.date}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.item}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.area}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.unit}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {fmtINR(b.unitPrice)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {fmtINR(b.amount)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {b.remarks}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            style={actionBtn("#0078D7")}
                            onClick={() => {
                              setBViewItem(b);
                              setBViewOpen(true);
                            }}
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                style={actionBtn("#FFA500")}
                                onClick={() => {
                                  setBPwdAction({ type: "edit", data: b });
                                }}
                                title="Edit"
                                data-ocid={`contractors.edit_button.${i + 1}`}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                style={actionBtn("#D32F2F")}
                                onClick={() =>
                                  setBPwdAction({ type: "delete", ids: [b.id] })
                                }
                                title="Delete"
                                data-ocid={`contractors.delete_button.${i + 1}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ════════════════════════════ PAYMENTS TAB ════════════════════════════ */}
        <TabsContent
          value="payments"
          style={{ flex: 1, overflow: "auto", margin: 0 }}
        >
          <div style={{ ...sectionHeader, gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {canManage && (
                <>
                  <button
                    type="button"
                    style={ribbonBtn()}
                    onClick={() =>
                      printContent(
                        `<h2>Contractor Payments</h2><p>Total: ${fmtINR(totalPaymentsAmt)}</p><table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Payment No</th><th>Date</th><th>Amount</th><th>Mode</th><th>Remarks</th></tr></thead><tbody>${filteredPayments.map((p, i) => `<tr><td>${i + 1}</td><td>${getContractorName(p.contractorId)}</td><td>${getProjectName(p.projectId)}</td><td>${p.paymentNo}</td><td>${p.date}</td><td>${fmtINR(p.amount)}</td><td>${p.paymentMode}</td><td>${p.remarks}</td></tr>`).join("")}</tbody></table>`,
                      )
                    }
                    title="Print"
                    data-ocid="contractors.print_button"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      printContent(
                        `<h2>Contractor Payments – PDF</h2><div class='summary'><div class='s-card'><h4>Total Payments</h4><p>${fmtINR(totalPaymentsAmt)}</p></div></div><table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Date</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${filteredPayments.map((p, i) => `<tr><td>${i + 1}</td><td>${getContractorName(p.contractorId)}</td><td>${getProjectName(p.projectId)}</td><td>${p.date}</td><td>${fmtINR(p.amount)}</td><td>${p.paymentMode}</td></tr>`).join("")}</tbody></table>`,
                      )
                    }
                    title="PDF"
                    data-ocid="contractors.secondary_button"
                  >
                    <FileText size={13} />
                    PDF
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#28A745")}
                    onClick={() => pImportRef.current?.click()}
                    title="Import CSV"
                    data-ocid="contractors.upload_button"
                  >
                    <Upload size={13} />
                    Import CSV
                  </button>
                  <input
                    ref={pImportRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      importCSV(f, async (row) => {
                        try {
                          await (actor as any).addContractorPayment(
                            row.ContractorId || "",
                            row.ProjectId || "",
                            row.PaymentNo || "",
                            row.Date || "",
                            Number(row.Amount || 0),
                            row.PaymentMode || "Account",
                            row.Remarks || "",
                          );
                        } catch {}
                      });
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["contractorPaymentsList"],
                        });
                        e.target.value = "";
                      }, 1500);
                    }}
                  />
                  <button
                    type="button"
                    style={ribbonBtn("#FFA500")}
                    onClick={() =>
                      exportCSV(
                        filteredPayments,
                        [
                          "id",
                          "contractorId",
                          "projectId",
                          "paymentNo",
                          "date",
                          "amount",
                          "paymentMode",
                          "remarks",
                        ],
                        "contractor-payments.csv",
                      )
                    }
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      downloadFormat(
                        [
                          "ContractorId",
                          "ProjectId",
                          "PaymentNo",
                          "Date",
                          "Amount",
                          "PaymentMode",
                          "Remarks",
                        ],
                        "contractor-payments-format.csv",
                      )
                    }
                    data-ocid="contractors.secondary_button"
                  >
                    <Download size={13} />
                    Format
                  </button>
                  <button
                    type="button"
                    style={ribbonBtn("#0078D7")}
                    onClick={openAddPayment}
                    data-ocid="contractors.primary_button"
                  >
                    <Plus size={13} />
                    New Payment
                  </button>
                  {pSelected.length > 0 && (
                    <button
                      type="button"
                      style={ribbonBtn("#FF0000")}
                      onClick={() => setPPwdAction({ type: "bulk" })}
                      data-ocid="contractors.delete_button"
                    >
                      <Trash2 size={13} />
                      Bulk Delete ({pSelected.length})
                    </button>
                  )}
                </>
              )}
            </div>
            <div
              style={{
                background: "#E8F5E9",
                border: "1px solid #28A745",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#28A745",
                whiteSpace: "nowrap",
              }}
            >
              Total Payments: {fmtINR(totalPaymentsAmt)}
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "10px 20px",
              background: "#f9f9f9",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={filterStyle}
              value={pFilter.contractorId}
              onChange={(e) =>
                setPFilter((f) => ({ ...f, contractorId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              style={filterStyle}
              value={pFilter.projectId}
              onChange={(e) =>
                setPFilter((f) => ({ ...f, projectId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              style={filterStyle}
              value={pFilter.paymentMode}
              onChange={(e) =>
                setPFilter((f) => ({ ...f, paymentMode: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Modes</option>
              <option value="Account">Account</option>
              <option value="Cash">Cash</option>
            </select>
            <input
              type="date"
              style={filterStyle}
              value={pFilter.dateFrom}
              onChange={(e) =>
                setPFilter((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
            <input
              type="date"
              style={filterStyle}
              value={pFilter.dateTo}
              onChange={(e) =>
                setPFilter((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
            <button
              type="button"
              style={{ ...ribbonBtn("#555"), fontSize: "11px" }}
              onClick={() =>
                setPFilter({
                  contractorId: "",
                  projectId: "",
                  paymentMode: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
              data-ocid="contractors.secondary_button"
            >
              Clear
            </button>
            <span style={{ fontSize: "11px", color: "#777" }}>
              Showing {filteredPayments.length} of {cPayments.length}
            </span>
          </div>

          {/* Payments Table */}
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {canManage && (
                    <th
                      style={{ ...thStyle, background: "#28A745", width: 36 }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          pSelected.length === filteredPayments.length &&
                          filteredPayments.length > 0
                        }
                        onChange={(e) =>
                          setPSelected(
                            e.target.checked
                              ? filteredPayments.map((p) => p.id)
                              : [],
                          )
                        }
                      />
                    </th>
                  )}
                  <th style={{ ...thStyle, background: "#28A745" }}>#</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>
                    Contractor
                  </th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Project</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>
                    Payment No
                  </th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Date</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>
                    Amount (INR)
                  </th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Mode</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Remarks</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#aaa",
                      }}
                      data-ocid="contractors.empty_state"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, i) => (
                    <tr key={p.id} data-ocid={`contractors.item.${i + 1}`}>
                      {canManage && (
                        <td
                          style={{
                            ...tdStyle(i % 2 === 0),
                            background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={pSelected.includes(p.id)}
                            onChange={(e) =>
                              setPSelected((prev) =>
                                e.target.checked
                                  ? [...prev, p.id]
                                  : prev.filter((x) => x !== p.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {getContractorName(p.contractorId)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {getProjectName(p.projectId)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {p.paymentNo}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {p.date}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                          fontWeight: 700,
                          color: p.amount < 0 ? "#D32F2F" : undefined,
                        }}
                      >
                        {fmtINR(p.amount)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        <span
                          style={{
                            background:
                              p.paymentMode === "Account"
                                ? "#E3F2FD"
                                : "#FFF8E1",
                            color:
                              p.paymentMode === "Account"
                                ? "#0078D7"
                                : "#FFA500",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {p.paymentMode}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                        }}
                      >
                        {p.remarks}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_PAYMENT : "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            style={actionBtn("#0078D7")}
                            onClick={() => {
                              setPViewItem(p);
                              setPViewOpen(true);
                            }}
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                style={actionBtn("#FFA500")}
                                onClick={() =>
                                  setPPwdAction({ type: "edit", data: p })
                                }
                                title="Edit"
                                data-ocid={`contractors.edit_button.${i + 1}`}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                style={actionBtn("#D32F2F")}
                                onClick={() =>
                                  setPPwdAction({ type: "delete", ids: [p.id] })
                                }
                                title="Delete"
                                data-ocid={`contractors.delete_button.${i + 1}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ════════════════════════════ REPORTS TAB ════════════════════════════ */}
        <TabsContent
          value="reports"
          style={{ flex: 1, overflow: "auto", margin: 0 }}
        >
          <div style={{ ...sectionHeader, gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                style={ribbonBtn()}
                onClick={() => {
                  const rows = ledgerEntries
                    .map(
                      (e, i) =>
                        `<tr style="background:${e.credit < 0 ? "#FFF8E1" : i % 2 === 0 ? "#f9f9f9" : "#fff"}"><td>${i + 1}</td><td>${e.date}</td><td>${getContractorName(e.contractorId)}</td><td>${getProjectName(e.projectId)}</td><td>${e.desc}</td><td>${e.debit > 0 ? fmtINR(e.debit) : ""}</td><td style="color:${e.credit < 0 ? "#D32F2F" : "#333"}">${e.credit > 0 ? fmtINR(e.credit) : ""}</td><td style="color:${e.balance < 0 ? "#D32F2F" : "#28A745"};font-weight:bold">${fmtINR(e.balance)}</td></tr>`,
                    )
                    .join("");
                  printContent(
                    `<h2>Contractor Ledger Report</h2><div class='summary'><div class='s-card'><h4>Total Bills</h4><p>${fmtINR(rTotalBills)}</p></div><div class='s-card'><h4>Total Payments</h4><p>${fmtINR(rTotalPayments)}</p></div><div class='s-card'><h4>Outstanding</h4><p style="color:${(rTotalBills - rTotalPayments) < 0 ? "#D32F2F" : "#28A745"}>${fmtINR(rTotalBills - rTotalPayments)}</p></div></div><table><thead><tr><th>#</th><th>Date</th><th>Contractor</th><th>Project</th><th>Description</th><th>Debit (Bills)</th><th>Credit (Payments)</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`,
                  );
                }}
                data-ocid="contractors.print_button"
              >
                <Printer size={13} />
                Print
              </button>
              <button
                type="button"
                style={ribbonBtn("#555")}
                onClick={() => {
                  const rows = ledgerEntries
                    .map(
                      (e, i) =>
                        `<tr><td>${i + 1}</td><td>${e.date}</td><td>${getContractorName(e.contractorId)}</td><td>${getProjectName(e.projectId)}</td><td>${e.desc}</td><td>${e.debit > 0 ? fmtINR(e.debit) : ""}</td><td>${e.credit > 0 ? fmtINR(e.credit) : ""}</td><td>${fmtINR(e.balance)}</td></tr>`,
                    )
                    .join("");
                  printContent(
                    `<h2>Contractor Ledger – PDF</h2><div class='summary'><div class='s-card'><h4>Total Bills</h4><p>${fmtINR(rTotalBills)}</p></div><div class='s-card'><h4>Total Payments</h4><p>${fmtINR(rTotalPayments)}</p></div><div class='s-card'><h4>Outstanding</h4><p>${fmtINR(rTotalBills - rTotalPayments)}</p></div></div><table><thead><tr><th>#</th><th>Date</th><th>Contractor</th><th>Project</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`,
                  );
                }}
                data-ocid="contractors.secondary_button"
              >
                <FileText size={13} />
                PDF
              </button>
              <button
                type="button"
                style={ribbonBtn("#FFA500")}
                onClick={() =>
                  exportCSV(
                    ledgerEntries.map((e, i) => ({
                      "#": i + 1,
                      Date: e.date,
                      Contractor: getContractorName(e.contractorId),
                      Project: getProjectName(e.projectId),
                      Description: e.desc,
                      Debit: e.debit || "0",
                      Credit: e.credit || "0",
                      Balance: e.balance,
                    })),
                    [
                      "#",
                      "Date",
                      "Contractor",
                      "Project",
                      "Description",
                      "Debit",
                      "Credit",
                      "Balance",
                    ],
                    "contractor-ledger.csv",
                  )
                }
                data-ocid="contractors.secondary_button"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  background: "#FFEBEE",
                  border: "1px solid #D32F2F",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#D32F2F",
                }}
              >
                Bills: {fmtINR(rTotalBills)}
              </div>
              <div
                style={{
                  background: "#E8F5E9",
                  border: "1px solid #28A745",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#28A745",
                }}
              >
                Payments: {fmtINR(rTotalPayments)}
              </div>
              <div
                style={{
                  background: "#FFF3E0",
                  border: "1px solid #FFA500",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#FFA500",
                }}
              >
                Outstanding: {fmtINR(rTotalBills - rTotalPayments)}
              </div>
            </div>
          </div>

          {/* Ledger Filters */}
          <div
            style={{
              padding: "10px 20px",
              background: "#f9f9f9",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={filterStyle}
              value={rFilter.contractorId}
              onChange={(e) =>
                setRFilter((f) => ({ ...f, contractorId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              style={filterStyle}
              value={rFilter.projectId}
              onChange={(e) =>
                setRFilter((f) => ({ ...f, projectId: e.target.value }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              style={filterStyle}
              value={rFilter.dateFrom}
              onChange={(e) =>
                setRFilter((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
            <input
              type="date"
              style={filterStyle}
              value={rFilter.dateTo}
              onChange={(e) =>
                setRFilter((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
            <button
              type="button"
              style={{ ...ribbonBtn("#555"), fontSize: "11px" }}
              onClick={() =>
                setRFilter({
                  contractorId: "",
                  projectId: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
              data-ocid="contractors.secondary_button"
            >
              Clear
            </button>
          </div>

          {/* Ledger Table */}
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Contractor</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Debit (Bills)</th>
                  <th style={thStyle}>Credit (Payments)</th>
                  <th style={thStyle}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#aaa",
                      }}
                      data-ocid="contractors.empty_state"
                    >
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((e, i) => (
                    <tr
                      key={`${e.date}-${e.contractorId}-${e.desc.slice(0, 10)}-${i}`}
                      style={{
                        background:
                          e.credit < 0
                            ? "#FFF8E1"
                            : i % 2 === 0
                              ? "#f9f9f9"
                              : "#fff",
                      }}
                    >
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        {e.date}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        {getContractorName(e.contractorId)}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        {getProjectName(e.projectId)}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        {e.desc}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                          color: "#D32F2F",
                          fontWeight: e.debit > 0 ? 700 : 400,
                        }}
                      >
                        {e.debit > 0 ? fmtINR(e.debit) : ""}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                          color: e.credit < 0 ? "#D32F2F" : "#28A745",
                          fontWeight: e.credit > 0 ? 700 : 400,
                        }}
                      >
                        {e.credit > 0 ? fmtINR(e.credit) : ""}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontFamily: "'Century Gothic',Arial,sans-serif",
                          borderBottom: "1px solid #e0e0e0",
                          fontWeight: 700,
                          color: e.balance < 0 ? "#D32F2F" : "#28A745",
                        }}
                      >
                        {fmtINR(e.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════ MODALS ════════════════════════════ */}

      {/* Contractor Form */}
      <Dialog
        open={cFormOpen}
        onOpenChange={(open) => {
          if (!open) setCFormOpen(false);
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="contractors.modal"
        >
          <DialogHeader>
            <DialogTitle>
              {cEditing ? "Edit Contractor" : "New Contractor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Name *</Label>
              <Input
                value={cForm.name}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Contractor name"
                data-ocid="contractors.input"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Trade(s)</Label>
              <div className="flex flex-wrap gap-3">
                {TRADES.map((t) => (
                  <label
                    key={t}
                    htmlFor={`trade-${t}`}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <Checkbox
                      id={`trade-${t}`}
                      checked={cForm.trades.includes(t)}
                      onCheckedChange={(checked) =>
                        setCForm((f) => ({
                          ...f,
                          trades: checked
                            ? [...f.trades, t]
                            : f.trades.filter((x) => x !== t),
                        }))
                      }
                      data-ocid="contractors.checkbox"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Project</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={cForm.projectId}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, projectId: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input
                type="date"
                value={cForm.date}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Contracting Price</Label>
              <Input
                type="number"
                value={cForm.contractingPrice}
                onChange={(e) =>
                  setCForm((f) => ({
                    ...f,
                    contractingPrice: Number(e.target.value),
                  }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={cForm.unit}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, unit: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Contact Number 1</Label>
              <Input
                value={cForm.contact1}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, contact1: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Contact Number 2</Label>
              <Input
                value={cForm.contact2}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, contact2: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Email ID</Label>
              <Input
                type="email"
                value={cForm.email}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, email: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Link 1</Label>
              <Input
                value={cForm.link1}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, link1: e.target.value }))
                }
                placeholder="https://..."
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Link 2</Label>
              <Input
                value={cForm.link2}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, link2: e.target.value }))
                }
                placeholder="https://..."
                data-ocid="contractors.input"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Address</Label>
              <Textarea
                value={cForm.address}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, address: e.target.value }))
                }
                rows={2}
                data-ocid="contractors.textarea"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Note</Label>
              <Textarea
                value={cForm.note}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={2}
                data-ocid="contractors.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCFormOpen(false)}
              data-ocid="contractors.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveContractor}
              style={{ background: "#0078D7", color: "#fff" }}
              data-ocid="contractors.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contractor View */}
      <Dialog
        open={cViewOpen}
        onOpenChange={(open) => {
          if (!open) setCViewOpen(false);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="contractors.modal">
          <DialogHeader>
            <DialogTitle>Contractor Details</DialogTitle>
          </DialogHeader>
          {cViewItem && (
            <div className="space-y-2 text-sm py-2">
              {[
                { k: "Name", v: cViewItem.name },
                { k: "Trade(s)", v: cViewItem.trades.join(", ") },
                { k: "Project", v: getProjectName(cViewItem.projectId) },
                { k: "Date", v: cViewItem.date },
                {
                  k: "Contracting Price",
                  v: fmtINR(cViewItem.contractingPrice),
                },
                { k: "Unit", v: cViewItem.unit },
                { k: "Contact 1", v: cViewItem.contact1 },
                { k: "Contact 2", v: cViewItem.contact2 },
                { k: "Email", v: cViewItem.email },
                { k: "Address", v: cViewItem.address },
                { k: "Note", v: cViewItem.note },
              ].map(({ k, v }) =>
                v ? (
                  <div key={k} className="flex gap-2">
                    <span className="font-bold w-36 flex-shrink-0">{k}:</span>
                    <span>{v}</span>
                  </div>
                ) : null,
              )}
              {cViewItem.link1 && (
                <div className="flex gap-2">
                  <span className="font-bold w-36 flex-shrink-0">Link 1:</span>
                  <a
                    href={cViewItem.link1}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0078D7" }}
                  >
                    {cViewItem.link1}
                  </a>
                </div>
              )}
              {cViewItem.link2 && (
                <div className="flex gap-2">
                  <span className="font-bold w-36 flex-shrink-0">Link 2:</span>
                  <a
                    href={cViewItem.link2}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0078D7" }}
                  >
                    {cViewItem.link2}
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCViewOpen(false)}
              data-ocid="contractors.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Form */}
      <Dialog
        open={bFormOpen}
        onOpenChange={(open) => {
          if (!open) setBFormOpen(false);
        }}
      >
        <DialogContent className="max-w-xl" data-ocid="contractors.modal">
          <DialogHeader>
            <DialogTitle>
              {bEditing ? "Edit Bill" : "New Contractor Bill"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Contractor Name</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={bForm.contractorId}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, contractorId: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="">Select contractor...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Project Name</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={bForm.projectId}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, projectId: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Bill No *</Label>
              <Input
                value={bForm.billNo}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, billNo: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input
                type="date"
                value={bForm.date}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Item</Label>
              <Input
                value={bForm.item}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, item: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Area</Label>
              <Input
                type="number"
                value={bForm.area}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, area: Number(e.target.value) }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={bForm.unit}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, unit: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit Price</Label>
              <Input
                type="number"
                value={bForm.unitPrice}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Amount (auto)</Label>
              <div
                style={{
                  padding: "8px 12px",
                  background: "#f0f8ff",
                  border: "1px solid #0078D7",
                  borderRadius: "4px",
                  fontWeight: 700,
                  color: "#0078D7",
                  fontSize: "13px",
                }}
              >
                {fmtINR(bForm.area * bForm.unitPrice)}
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Remarks</Label>
              <Input
                value={bForm.remarks}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, remarks: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBFormOpen(false)}
              data-ocid="contractors.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveBill}
              style={{ background: "#0078D7", color: "#fff" }}
              data-ocid="contractors.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill View */}
      <Dialog
        open={bViewOpen}
        onOpenChange={(open) => {
          if (!open) setBViewOpen(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="contractors.modal">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {bViewItem && (
            <div className="space-y-2 text-sm py-2">
              {[
                {
                  k: "Contractor",
                  v: getContractorName(bViewItem.contractorId),
                },
                { k: "Project", v: getProjectName(bViewItem.projectId) },
                { k: "Bill No", v: bViewItem.billNo },
                { k: "Date", v: bViewItem.date },
                { k: "Item", v: bViewItem.item },
                { k: "Area", v: String(bViewItem.area) },
                { k: "Unit", v: bViewItem.unit },
                { k: "Unit Price", v: fmtINR(bViewItem.unitPrice) },
                { k: "Amount", v: fmtINR(bViewItem.amount) },
                { k: "Remarks", v: bViewItem.remarks },
              ].map(({ k, v }) =>
                v ? (
                  <div key={k} className="flex gap-2">
                    <span className="font-bold w-28 flex-shrink-0">{k}:</span>
                    <span>{v}</span>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBViewOpen(false)}
              data-ocid="contractors.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Form */}
      <Dialog
        open={pFormOpen}
        onOpenChange={(open) => {
          if (!open) setPFormOpen(false);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="contractors.modal">
          <DialogHeader>
            <DialogTitle>
              {pEditing ? "Edit Payment" : "New Contractor Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Contractor Name</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={pForm.contractorId}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, contractorId: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="">Select contractor...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Project Name</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={pForm.projectId}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, projectId: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Payment No</Label>
              <Input
                value={pForm.paymentNo}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, paymentNo: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input
                type="date"
                value={pForm.date}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Amount</Label>
              <Input
                type="number"
                value={pForm.amount}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, amount: Number(e.target.value) }))
                }
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Payment Mode</Label>
              <select
                style={{ ...filterStyle, width: "100%" }}
                value={pForm.paymentMode}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, paymentMode: e.target.value }))
                }
                data-ocid="contractors.select"
              >
                <option value="Account">Account</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Remarks</Label>
              <Input
                value={pForm.remarks}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, remarks: e.target.value }))
                }
                data-ocid="contractors.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPFormOpen(false)}
              data-ocid="contractors.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={savePayment}
              style={{ background: "#0078D7", color: "#fff" }}
              data-ocid="contractors.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment View */}
      <Dialog
        open={pViewOpen}
        onOpenChange={(open) => {
          if (!open) setPViewOpen(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="contractors.modal">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {pViewItem && (
            <div className="space-y-2 text-sm py-2">
              {[
                {
                  k: "Contractor",
                  v: getContractorName(pViewItem.contractorId),
                },
                { k: "Project", v: getProjectName(pViewItem.projectId) },
                { k: "Payment No", v: pViewItem.paymentNo },
                { k: "Date", v: pViewItem.date },
                { k: "Amount", v: fmtINR(pViewItem.amount) },
                { k: "Mode", v: pViewItem.paymentMode },
                { k: "Remarks", v: pViewItem.remarks },
              ].map(({ k, v }) =>
                v ? (
                  <div key={k} className="flex gap-2">
                    <span className="font-bold w-28 flex-shrink-0">{k}:</span>
                    <span>{v}</span>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPViewOpen(false)}
              data-ocid="contractors.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Password Modals ── */}
      {/* Contractor pwd */}
      <PasswordModal
        open={!!cPwdAction}
        title={
          cPwdAction?.type === "bulk"
            ? `Bulk Delete ${(cPwdAction?.ids || cSelected).length} contractors?`
            : cPwdAction?.type === "delete"
              ? "Delete Contractor?"
              : "Confirm Edit"
        }
        onCancel={() => setCPwdAction(null)}
        onConfirm={async (pwd) => {
          if (cPwdAction?.type === "delete") {
            await deleteContractor(cPwdAction.ids![0], pwd);
            setCPwdAction(null);
          } else if (cPwdAction?.type === "bulk") {
            await bulkDeleteContractors(pwd);
            setCPwdAction(null);
          } else if (cPwdAction?.type === "edit") {
            setCEditPwd(pwd);
            await handleContractorEditPwd(pwd);
          }
        }}
      />

      {/* Bill pwd */}
      <PasswordModal
        open={!!bPwdAction}
        title={
          bPwdAction?.type === "bulk"
            ? `Bulk Delete ${bSelected.length} bills?`
            : bPwdAction?.type === "delete"
              ? "Delete Bill?"
              : "Confirm Edit"
        }
        onCancel={() => setBPwdAction(null)}
        onConfirm={async (pwd) => {
          if (bPwdAction?.type === "delete") {
            await deleteBill(bPwdAction.ids![0], pwd);
            setBPwdAction(null);
          } else if (bPwdAction?.type === "bulk") {
            await bulkDeleteBills(pwd);
            setBPwdAction(null);
          } else if (bPwdAction?.type === "edit") {
            const b = bPwdAction.data as ContractorBillRecord;
            setBEditing(b);
            setBForm({
              contractorId: b.contractorId,
              projectId: b.projectId,
              billNo: b.billNo,
              date: b.date,
              item: b.item,
              area: b.area,
              unit: b.unit,
              unitPrice: b.unitPrice,
              remarks: b.remarks,
            });
            setBPwdAction(null);
            setBFormOpen(true);
          }
        }}
      />

      {/* Payment pwd */}
      <PasswordModal
        open={!!pPwdAction}
        title={
          pPwdAction?.type === "bulk"
            ? `Bulk Delete ${pSelected.length} payments?`
            : pPwdAction?.type === "delete"
              ? "Delete Payment?"
              : "Confirm Edit"
        }
        onCancel={() => setPPwdAction(null)}
        onConfirm={async (pwd) => {
          if (pPwdAction?.type === "delete") {
            await deletePayment(pPwdAction.ids![0], pwd);
            setPPwdAction(null);
          } else if (pPwdAction?.type === "bulk") {
            await bulkDeletePayments(pwd);
            setPPwdAction(null);
          } else if (pPwdAction?.type === "edit") {
            const p = pPwdAction.data as ContractorPaymentRecord;
            setPEditing(p);
            setPForm({
              contractorId: p.contractorId,
              projectId: p.projectId,
              paymentNo: p.paymentNo,
              date: p.date,
              amount: p.amount,
              paymentMode: p.paymentMode,
              remarks: p.remarks,
            });
            setPPwdAction(null);
            setPFormOpen(true);
          }
        }}
      />
    </div>
  );
}
