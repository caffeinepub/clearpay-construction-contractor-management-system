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
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import {
  useGetAllProjects,
  useGetCallerUserProfile,
  useGetCompletedProjectIds,
} from "../hooks/useQueries";
import { shareReceiptAsImage } from "../utils/receiptShare";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContractorRecord = {
  id: string;
  name: string;
  trades: string[];
  projectId: string;
  date: string;
  woNo: string;
  contractingPrice: number;
  unit: string;
  contact1: string;
  contact2: string;
  email: string;
  address: string;
  link1: string;
  link2: string;
  note: string;
  completed?: boolean;
};

type ContractorBillRecord = {
  id: string;
  contractorId: string;
  projectId: string;
  billNo: string;
  blockId: string;
  date: string;
  item: string;
  area: number;
  unit: string;
  unitPrice: number;
  workRetention: number;
  workRetentionAmount: number;
  amount: number;
  grossAmount: number;
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
function fmtDate(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4)
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

function printReceipt(
  type: "contractor" | "bill" | "payment",
  data: Record<string, string>,
) {
  const borderColor =
    type === "contractor" ? "#0078D7" : type === "bill" ? "#FFA500" : "#28A745";
  const title =
    type === "contractor"
      ? "Contractor Receipt"
      : type === "bill"
        ? "Bill Receipt"
        : "Payment Receipt";
  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:600;color:#555;width:45%;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0">${v}</td></tr>`,
    )
    .join("");
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page{size:A4 portrait;margin:20mm 15mm}
    body{font-family:'Century Gothic',Arial,sans-serif;margin:0;padding:0;width:180mm;min-height:148mm;max-height:148mm;background:#fff;position:relative}
    body::after{content:"ClearPay";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-family:'Century Gothic',Arial,sans-serif;font-size:72pt;font-weight:700;color:#0078D7;opacity:0.10;pointer-events:none;z-index:9999}
    .header{background:#0078D7;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
    .header h1{margin:0;font-size:18px;font-weight:700}
    .header small{font-size:11px;opacity:.85}
    .body{border-left:5px solid ${borderColor};margin:12px;padding:12px;background:#fafafa;border-radius:4px}
    .body h2{margin:0 0 10px;color:${borderColor};font-size:14px;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:12px}
    .footer{text-align:center;font-size:10px;color:#888;padding:10px;margin-top:10px;border-top:1px solid #eee}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="header"><h1>ClearPay</h1><small>MKT Constructions</small></div>
    <div class="body">
      <h2>${title}</h2>
      <table>${rows}</table>
    </div>
    <div class="footer">© 2025 ClearPay. Powered by Seri AI.</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

const TRADES = [
  "NMR",
  "M S",
  "Plywood",
  "Cup Lock",
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

function shareReceipt(
  type: "contractor" | "bill" | "payment",
  data: Record<string, string>,
) {
  const borderColors = {
    contractor: "#0078D7",
    bill: "#FFA500",
    payment: "#28A745",
  };
  const titles = {
    contractor: "Contractor Receipt",
    bill: "Bill Receipt",
    payment: "Payment Receipt",
  };
  shareReceiptAsImage({
    title: titles[type],
    borderColor: borderColors[type],
    rows: Object.entries(data).filter(([, v]) => !!v) as [string, string][],
    filename: `${type}-receipt.png`,
  });
}
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

  // ── Completed contractors (derived from backend data) ──
  const completedContractorIds = useMemo(
    () => new Set(contractors.filter((c) => c.completed).map((c) => c.id)),
    [contractors],
  );

  const { data: completedProjectIds = [] } = useGetCompletedProjectIds();
  const completedProjectIdSet = useMemo(
    () => new Set(completedProjectIds as string[]),
    [completedProjectIds],
  );

  const toggleCompletedMutation = useMutation({
    mutationFn: async (id: string) => {
      await (actor as any).toggleContractorCompleted(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractorsList"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update status"),
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
    woNo: "",
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
  const [bForm, setBForm] = useState<Omit<ContractorBillRecord, "id">>({
    contractorId: "",
    projectId: "",
    billNo: "",
    blockId: "",
    date: "",
    item: "",
    area: 0,
    unit: "Sft",
    unitPrice: 0,
    workRetention: 0,
    workRetentionAmount: 0,
    amount: 0,
    grossAmount: 0,
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

  // ── Sort states for each tab ──
  const [cSortField, setCSort] = useState<string | null>(null);
  const [cSortDir, setCDir] = useState<"asc" | "desc" | null>(null);
  const [bSortField, setBSort] = useState<string | null>(null);
  const [bSortDir, setBDir] = useState<"asc" | "desc" | null>(null);
  const [pSortField, setPSort] = useState<string | null>(null);
  const [pSortDir, setPDir] = useState<"asc" | "desc" | null>(null);
  const [rSortField, setRSort] = useState<string | null>(null);
  const [rSortDir, setRDir] = useState<"asc" | "desc" | null>(null);

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
        if (completedContractorIds.has(b.contractorId?.trim())) return false;
        if (completedProjectIdSet.has(b.projectId?.trim())) return false;
        if (
          bFilter.contractorId &&
          b.contractorId?.trim() !== bFilter.contractorId.trim()
        )
          return false;
        if (
          bFilter.projectId &&
          b.projectId?.trim() !== bFilter.projectId.trim()
        )
          return false;
        if (bFilter.dateFrom && b.date < bFilter.dateFrom) return false;
        if (bFilter.dateTo && b.date > bFilter.dateTo) return false;
        return true;
      }),
    [cBills, bFilter, completedContractorIds, completedProjectIdSet],
  );

  const filteredPayments = useMemo(
    () =>
      cPayments.filter((p) => {
        if (completedContractorIds.has(p.contractorId?.trim())) return false;
        if (completedProjectIdSet.has(p.projectId?.trim())) return false;
        if (
          pFilter.contractorId &&
          p.contractorId?.trim() !== pFilter.contractorId.trim()
        )
          return false;
        if (
          pFilter.projectId &&
          p.projectId?.trim() !== pFilter.projectId.trim()
        )
          return false;
        if (pFilter.paymentMode && p.paymentMode !== pFilter.paymentMode)
          return false;
        if (pFilter.dateFrom && p.date < pFilter.dateFrom) return false;
        if (pFilter.dateTo && p.date > pFilter.dateTo) return false;
        return true;
      }),
    [cPayments, pFilter, completedContractorIds, completedProjectIdSet],
  );

  const rFilteredBills = useMemo(
    () =>
      cBills.filter((b) => {
        if (completedContractorIds.has(b.contractorId?.trim())) return false;
        if (completedProjectIdSet.has(b.projectId?.trim())) return false;
        if (
          rFilter.contractorId &&
          b.contractorId?.trim() !== rFilter.contractorId.trim()
        )
          return false;
        if (
          rFilter.projectId &&
          b.projectId?.trim() !== rFilter.projectId.trim()
        )
          return false;
        if (rFilter.dateFrom && b.date < rFilter.dateFrom) return false;
        if (rFilter.dateTo && b.date > rFilter.dateTo) return false;
        return true;
      }),
    [cBills, rFilter, completedContractorIds, completedProjectIdSet],
  );

  const rFilteredPayments = useMemo(
    () =>
      cPayments.filter((p) => {
        if (completedContractorIds.has(p.contractorId?.trim())) return false;
        if (completedProjectIdSet.has(p.projectId?.trim())) return false;
        if (
          rFilter.contractorId &&
          p.contractorId?.trim() !== rFilter.contractorId.trim()
        )
          return false;
        if (
          rFilter.projectId &&
          p.projectId?.trim() !== rFilter.projectId.trim()
        )
          return false;
        if (rFilter.dateFrom && p.date < rFilter.dateFrom) return false;
        if (rFilter.dateTo && p.date > rFilter.dateTo) return false;
        return true;
      }),
    [cPayments, rFilter, completedContractorIds, completedProjectIdSet],
  );

  // ── Dynamic filter options (data-driven) ──
  // Contractors tab: projects that have at least one contractor linked
  const cProjectOptions = useMemo(() => {
    const filtered = cFilter.name
      ? contractors.filter((c) =>
          c.name.toLowerCase().includes(cFilter.name.toLowerCase()),
        )
      : contractors;
    const ids = [...new Set(filtered.map((c) => c.projectId))].filter(Boolean);
    return projects.filter((p) => ids.includes(p.id));
  }, [contractors, projects, cFilter.name]);

  // Bills tab: contractor options from bills data
  const bContractorOptions = useMemo(() => {
    const ids = [
      ...new Set(
        cBills
          .filter((b) => !completedContractorIds.has(b.contractorId?.trim()))
          .map((b) => b.contractorId?.trim()),
      ),
    ].filter(Boolean);
    return contractors.filter((c) => ids.includes(c.id?.trim()));
  }, [cBills, contractors, completedContractorIds]);

  // Bills tab: project options scoped to selected contractor
  const bProjectOptions = useMemo(() => {
    const relevantBills = bFilter.contractorId
      ? cBills.filter(
          (b) => b.contractorId?.trim() === bFilter.contractorId.trim(),
        )
      : cBills;
    const ids = [
      ...new Set(
        relevantBills
          .filter((b) => !completedProjectIdSet.has(b.projectId?.trim()))
          .map((b) => b.projectId?.trim()),
      ),
    ].filter(Boolean);
    return projects.filter((p) => ids.includes(p.id?.trim()));
  }, [cBills, projects, bFilter.contractorId, completedProjectIdSet]);

  // Payments tab: contractor options from payments data
  const pContractorOptions = useMemo(() => {
    const ids = [
      ...new Set(
        cPayments
          .filter((p) => !completedContractorIds.has(p.contractorId?.trim()))
          .map((p) => p.contractorId?.trim()),
      ),
    ].filter(Boolean);
    return contractors.filter((c) => ids.includes(c.id?.trim()));
  }, [cPayments, contractors, completedContractorIds]);

  // Payments tab: project options scoped to selected contractor
  const pProjectOptions = useMemo(() => {
    const relevantPayments = pFilter.contractorId
      ? cPayments.filter(
          (p) => p.contractorId?.trim() === pFilter.contractorId.trim(),
        )
      : cPayments;
    const ids = [
      ...new Set(
        relevantPayments
          .filter((p) => !completedProjectIdSet.has(p.projectId?.trim()))
          .map((p) => p.projectId?.trim()),
      ),
    ].filter(Boolean);
    return projects.filter((p) => ids.includes(p.id?.trim()));
  }, [cPayments, projects, pFilter.contractorId, completedProjectIdSet]);

  // Reports tab: contractor options from combined bills+payments data
  const rContractorOptions = useMemo(() => {
    const billIds = cBills
      .filter((b) => !completedContractorIds.has(b.contractorId?.trim()))
      .map((b) => b.contractorId?.trim());
    const payIds = cPayments
      .filter((p) => !completedContractorIds.has(p.contractorId?.trim()))
      .map((p) => p.contractorId?.trim());
    const ids = [...new Set([...billIds, ...payIds])].filter(Boolean);
    return contractors.filter((c) => ids.includes(c.id?.trim()));
  }, [cBills, cPayments, contractors, completedContractorIds]);

  // Reports tab: project options scoped to selected contractor
  const rProjectOptions = useMemo(() => {
    const filteredBills = rFilter.contractorId
      ? cBills.filter(
          (b) => b.contractorId?.trim() === rFilter.contractorId.trim(),
        )
      : cBills;
    const filteredPayments = rFilter.contractorId
      ? cPayments.filter(
          (p) => p.contractorId?.trim() === rFilter.contractorId.trim(),
        )
      : cPayments;
    const billProjIds = filteredBills
      .filter((b) => !completedProjectIdSet.has(b.projectId?.trim()))
      .map((b) => b.projectId?.trim());
    const payProjIds = filteredPayments
      .filter((p) => !completedProjectIdSet.has(p.projectId?.trim()))
      .map((p) => p.projectId?.trim());
    const ids = [...new Set([...billProjIds, ...payProjIds])].filter(Boolean);
    return projects.filter((p) => ids.includes(p.id?.trim()));
  }, [
    cBills,
    cPayments,
    projects,
    rFilter.contractorId,
    completedProjectIdSet,
  ]);

  // ── Helpers ──
  const getContractorName = (id: string) =>
    contractors.find((c) => c.id === id)?.name || id;
  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id;

  // ── Sort helpers ──
  const mkHandleSort =
    (
      field: string | null,
      setField: (f: string | null) => void,
      dir: "asc" | "desc" | null,
      setDir: (d: "asc" | "desc" | null) => void,
    ) =>
    (col: string) => {
      if (field === col) {
        if (dir === "asc") setDir("desc");
        else if (dir === "desc") {
          setField(null);
          setDir(null);
        } else setDir("asc");
      } else {
        setField(col);
        setDir("asc");
      }
    };

  const mkGetSortIcon =
    (field: string | null, dir: "asc" | "desc" | null, activeColor: string) =>
    (col: string) => {
      if (field !== col)
        return (
          <ArrowUpDown
            style={{
              display: "inline",
              width: 11,
              height: 11,
              marginLeft: 3,
              opacity: 0.45,
            }}
          />
        );
      if (dir === "asc")
        return (
          <ArrowUp
            style={{
              display: "inline",
              width: 11,
              height: 11,
              marginLeft: 3,
              color: activeColor,
            }}
          />
        );
      return (
        <ArrowDown
          style={{
            display: "inline",
            width: 11,
            height: 11,
            marginLeft: 3,
            color: activeColor,
          }}
        />
      );
    };

  const handleCSort = mkHandleSort(cSortField, setCSort, cSortDir, setCDir);
  const handleBSort = mkHandleSort(bSortField, setBSort, bSortDir, setBDir);
  const handlePSort = mkHandleSort(pSortField, setPSort, pSortDir, setPDir);
  const handleRSort = mkHandleSort(rSortField, setRSort, rSortDir, setRDir);
  const getCIcon = mkGetSortIcon(cSortField, cSortDir, "#88CDF6");
  const getBIcon = mkGetSortIcon(bSortField, bSortDir, "#FFBE88");
  const getPIcon = mkGetSortIcon(pSortField, pSortDir, "#56C596");
  const getRIcon = mkGetSortIcon(rSortField, rSortDir, "#ffb74d");

  const applySortStr = <T,>(
    arr: T[],
    field: string | null,
    dir: "asc" | "desc" | null,
    getVal: (item: T, f: string) => any,
  ): T[] => {
    if (!field || !dir) return arr;
    return [...arr].sort((a, b) => {
      const av = getVal(a, field);
      const bv = getVal(b, field);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  };

  // ── W.O. No Auto-generator ──
  const generateWoNo = (
    projectId: string,
    date: string,
    serial: number,
  ): string => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj || !date) return "";
    const prefix = proj.name.substring(0, 2).toUpperCase();
    const [year, month, day] = date.split("-");
    const dd = (day || "").padStart(2, "0");
    const mm = (month || "").padStart(2, "0");
    const yy = (year || "").slice(-2);
    const ser = String(serial).padStart(2, "0");
    return `${prefix}${dd}${mm}${yy}${ser}`;
  };

  // ── Contractor CRUD ──
  const openAddContractor = () => {
    setCEditing(null);
    setCForm({
      name: "",
      trades: [],
      projectId: "",
      date: "",
      woNo: "",
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
      woNo: c.woNo || "",
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

  const cEditPwdRef = useRef("");
  const bEditPwdRef = useRef("");
  const pEditPwdRef = useRef("");

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
          cEditPwdRef.current,
          cForm.woNo || "",
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
          cForm.woNo || "",
        );
        toast.success("Contractor added");
      }
      setCFormOpen(false);
      setCEditing(null);
      cEditPwdRef.current = "";
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
      blockId: "",
      date: "",
      item: "",
      area: 0,
      unit: "Sft",
      unitPrice: 0,
      workRetention: 0,
      workRetentionAmount: 0,
      amount: 0,
      grossAmount: 0,
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
          bEditPwdRef.current,
          bForm.blockId || "",
          bForm.workRetention || 0,
          bForm.area * bForm.unitPrice * (bForm.workRetention / 100),
        );
        toast.success("Bill updated");
        bEditPwdRef.current = "";
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
          bForm.blockId || "",
          bForm.workRetention || 0,
          bForm.area * bForm.unitPrice * (bForm.workRetention / 100),
        );
        toast.success("Bill added");
      }
      setBFormOpen(false);
      setBEditing(null);
      queryClient.invalidateQueries({ queryKey: ["contractorBillsList"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save bill");
    }
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
    const nextNo = String(cPayments.length + 1).padStart(4, "0");
    setPForm({
      contractorId: "",
      projectId: "",
      paymentNo: nextNo,
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
          pEditPwdRef.current,
        );
        toast.success("Payment updated");
        pEditPwdRef.current = "";
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

  const printContent = (
    title: string,
    summaryHtml: string,
    tableHtml: string,
  ) => {
    const w = window.open("", "_blank")!;
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    w.document.write(`<html><head><title>${title}</title>
    <style>
      body { font-family: 'Century Gothic', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
      .header { background: linear-gradient(135deg, #0078D7 0%, #005a9e 100%); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px; }
      .header .sub { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
      .header .right { text-align: right; }
      .header .right .dt { font-size: 14px; font-weight: 600; }
      .summary { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
      .s-card { flex: 1; min-width: 140px; border-radius: 8px; padding: 12px 16px; }
      .s-card .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px; }
      .s-card .val { font-size: 17px; font-weight: 700; }
      .s-blue { background: #e3f2fd; border: 1px solid #90caf9; color: #1565c0; }
      .s-green { background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; }
      .s-orange { background: #fff3e0; border: 1px solid #ffcc80; color: #e65100; }
      .s-purple { background: #f3e5f5; border: 1px solid #ce93d8; color: #6a1b9a; }
      .s-red { background: #ffebee; border: 1px solid #ef9a9a; color: #c62828; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th { background: #0078D7; color: white; padding: 9px 11px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      tr:nth-child(even) td { background: #f8f9fa; }
      td { padding: 7px 11px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
      .footer { margin-top: 28px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 10px; }
      @media print { body { padding: 8px; } .header { border-radius: 4px; } }
    </style></head>
    <body>
      <div class="header">
        <div><h1>ClearPay</h1><div class="sub">${title}</div></div>
        <div class="right"><div class="dt">${dateStr} ${timeStr}</div></div>
      </div>
      ${summaryHtml}
      ${tableHtml}
      <div class="footer">© ${new Date().getFullYear()} ClearPay. Powered by Seri AI.</div>
    </body></html>`);
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
      workRetentionAmount: number;
    }[] = [
      ...rFilteredBills.map((b) => ({
        date: b.date,
        contractorId: b.contractorId,
        projectId: b.projectId,
        desc: `Bill #${b.billNo} – ${b.item}`,
        debit: b.grossAmount ?? b.area * b.unitPrice,
        credit: 0,
        workRetentionAmount: b.workRetentionAmount || 0,
      })),
      ...rFilteredPayments.map((p) => ({
        date: p.date,
        contractorId: p.contractorId,
        projectId: p.projectId,
        desc: `Payment #${p.paymentNo} (${p.paymentMode})`,
        debit: 0,
        credit: p.amount,
        workRetentionAmount: 0,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance, workRetentionAmount: e.workRetentionAmount || 0 };
    });
  }, [rFilteredBills, rFilteredPayments]);

  const totalBillsAmt = useMemo(
    () => filteredBills.reduce((s, b) => s + b.amount, 0),
    [filteredBills],
  );
  const totalAreaSft = useMemo(
    () => filteredBills.reduce((s, b) => s + (b.area || 0), 0),
    [filteredBills],
  );
  const totalPaymentsAmt = useMemo(
    () => filteredPayments.reduce((s, p) => s + p.amount, 0),
    [filteredPayments],
  );
  const rTotalBills = useMemo(
    () =>
      rFilteredBills.reduce(
        (s, b) => s + (b.grossAmount ?? b.area * b.unitPrice),
        0,
      ),
    [rFilteredBills],
  );
  const rTotalPayments = useMemo(
    () => rFilteredPayments.reduce((s, p) => s + p.amount, 0),
    [rFilteredPayments],
  );
  const rTotalWorkRetention = useMemo(
    () => rFilteredBills.reduce((s, b) => s + (b.workRetentionAmount || 0), 0),
    [rFilteredBills],
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
          <TabsList
            style={{ background: "transparent", gap: "6px", padding: "6px 0" }}
          >
            {(
              [
                {
                  value: "contractors",
                  label: "Contractors",
                  bg: "#E3F2FD",
                  active: "#0078D7",
                  text: "#0055A5",
                },
                {
                  value: "bills",
                  label: "Bills",
                  bg: "#FFF3E0",
                  active: "#FFA500",
                  text: "#C17600",
                },
                {
                  value: "payments",
                  label: "Payments",
                  bg: "#E8F5E9",
                  active: "#28A745",
                  text: "#1A7A32",
                },
                {
                  value: "reports",
                  label: "Reports",
                  bg: "#FCE4EC",
                  active: "#D32F2F",
                  text: "#A82323",
                },
              ] as const
            ).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                data-ocid={`contractors.${t.value}.tab`}
                style={{
                  fontFamily: "'Century Gothic',Arial,sans-serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  padding: "6px 20px",
                  borderRadius: "6px",
                  border: "2px solid transparent",
                  background: t.bg,
                  color: t.text,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                className={`contractor-tab-${t.value}`}
              >
                {t.label}
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
                      const summaryHtml = `<div class="summary"><div class="s-card s-blue"><div class="lbl">Total Contractors</div><div class="val">${filteredContractors.length}</div></div></div>`;
                      const tableHtml = `<table><thead><tr><th>#</th><th>Name</th><th>Trades</th><th>Project</th><th>Date</th><th>Price</th><th>Unit</th><th>Contact</th></tr></thead><tbody>${filteredContractors.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.trades.join(", ")}</td><td>${getProjectName(c.projectId)}</td><td>${fmtDate(c.date)}</td><td>${fmtINR(c.contractingPrice)}</td><td>${c.unit}</td><td>${c.contact1}</td></tr>`).join("")}</tbody></table>`;
                      printContent("Contractors List", summaryHtml, tableHtml);
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
                            row.WoNo || "",
                          );
                        } catch (err) {
                          toast.error(`Import error: ${err}`);
                        }
                      });
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["contractorsList"],
                        });
                        toast.success("Contractors imported successfully");
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
                          "WoNo",
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
              {cProjectOptions.map((p) => (
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
                  <th style={{ ...thStyle, width: 60, textAlign: "center" }}>
                    Status
                  </th>
                  <th style={thStyle}>#</th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("name")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("name");
                    }}
                  >
                    Name{getCIcon("name")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("trade")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("trade");
                    }}
                  >
                    Trade(s){getCIcon("trade")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("project")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("project");
                    }}
                  >
                    Project{getCIcon("project")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("date")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("date");
                    }}
                  >
                    Date{getCIcon("date")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("woNo")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("woNo");
                    }}
                  >
                    W.O. No{getCIcon("woNo")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleCSort("price")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCSort("price");
                    }}
                  >
                    Price (INR){getCIcon("price")}
                  </th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
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
                  applySortStr(
                    filteredContractors,
                    cSortField,
                    cSortDir,
                    (c, f) => {
                      if (f === "name") return c.name.toLowerCase();
                      if (f === "trade")
                        return c.trades.join(",").toLowerCase();
                      if (f === "project")
                        return (
                          getProjectName(c.projectId) ?? ""
                        ).toLowerCase();
                      if (f === "date") return c.date;
                      if (f === "woNo") return c.woNo.toLowerCase();
                      if (f === "price") return c.contractingPrice;
                      return "";
                    },
                  ).map((c, i) => (
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
                      <td
                        style={{ ...tdStyle(i % 2 === 0), textAlign: "center" }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCompletedMutation.mutate(c.id)}
                          title={
                            completedContractorIds.has(c.id)
                              ? "Mark as Active"
                              : "Mark as Completed"
                          }
                          style={{
                            width: 22,
                            height: 22,
                            border: completedContractorIds.has(c.id)
                              ? "2px solid #28A745"
                              : "2px solid #aaa",
                            borderRadius: "3px",
                            background: completedContractorIds.has(c.id)
                              ? "#28A745"
                              : "#fff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {completedContractorIds.has(c.id) ? "✓" : ""}
                        </button>
                      </td>
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
                      <td style={tdStyle(i % 2 === 0)}>{fmtDate(c.date)}</td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          fontWeight: 700,
                          color: "#0078D7",
                        }}
                      >
                        {c.woNo || "—"}
                      </td>
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
              <>
                <button
                  type="button"
                  style={ribbonBtn()}
                  onClick={() =>
                    printContent(
                      "Contractor Bills",
                      `<div class="summary"><div class="s-card s-blue"><div class="lbl">Total Bills (Gross)</div><div class="val">${fmtINR(filteredBills.reduce((s, b) => s + (b.grossAmount ?? b.area * b.unitPrice), 0))}</div></div></div><div class="s-card s-purple"><div class="lbl">Total Work Retention</div><div class="val">${fmtINR(filteredBills.reduce((s, b) => s + (b.workRetentionAmount || 0), 0))}</div></div></div>`,
                      `<table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Bill No</th><th>Block ID</th><th>Date</th><th>Item</th><th>Area</th><th>Unit</th><th>Unit Price</th><th>Gross Amt</th><th>WR%</th><th>WR Amt ₹</th><th>Net Amt</th></tr></thead><tbody>${filteredBills.map((b, i) => `<tr><td>${i + 1}</td><td>${getContractorName(b.contractorId)}</td><td>${getProjectName(b.projectId)}</td><td>${b.billNo}</td><td>${b.blockId || ""}</td><td>${fmtDate(b.date)}</td><td>${b.item}</td><td>${b.area}</td><td>${b.unit}</td><td>${fmtINR(b.unitPrice)}</td><td style="color:#1565c0">${fmtINR(b.grossAmount ?? b.area * b.unitPrice)}</td><td>${b.workRetention || 0}%</td><td style="color:#9c27b0">${fmtINR(b.workRetentionAmount || 0)}</td><td>${fmtINR(b.amount)}</td></tr>`).join("")}</tbody></table>`,
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
                      "Contractor Bills – Export PDF",
                      `<div class="summary"><div class="s-card s-blue"><div class="lbl">Total Bills (Gross)</div><div class="val">${fmtINR(filteredBills.reduce((s, b) => s + (b.grossAmount ?? b.area * b.unitPrice), 0))}</div></div></div><div class="s-card s-purple"><div class="lbl">Total Work Retention</div><div class="val">${fmtINR(filteredBills.reduce((s, b) => s + (b.workRetentionAmount || 0), 0))}</div></div></div>`,
                      `<table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Bill No</th><th>Block ID</th><th>Date</th><th>Gross Amt</th><th>WR%</th><th>WR Amt ₹</th><th>Net Amt</th><th>Remarks</th></tr></thead><tbody>${filteredBills.map((b, i) => `<tr><td>${i + 1}</td><td>${getContractorName(b.contractorId)}</td><td>${getProjectName(b.projectId)}</td><td>${b.billNo}</td><td>${b.blockId || ""}</td><td>${fmtDate(b.date)}</td><td style="color:#1565c0">${fmtINR(b.grossAmount ?? b.area * b.unitPrice)}</td><td>${b.workRetention || 0}%</td><td style="color:#9c27b0">${fmtINR(b.workRetentionAmount || 0)}</td><td>${fmtINR(b.amount)}</td><td>${b.remarks}</td></tr>`).join("")}</tbody></table>`,
                    )
                  }
                  title="PDF"
                  data-ocid="contractors.secondary_button"
                >
                  <FileText size={13} />
                  PDF
                </button>
                {canManage && (
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
                )}
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
                          row.BlockId || "",
                          Number(row.WRPercent || 0),
                          Number(row.WRAmount || 0),
                        );
                      } catch (err) {
                        toast.error(`Import error: ${err}`);
                      }
                    });
                    setTimeout(() => {
                      queryClient.invalidateQueries({
                        queryKey: ["contractorBillsList"],
                      });
                      toast.success("Bills imported successfully");
                      e.target.value = "";
                    }, 1500);
                  }}
                />
                <button
                  type="button"
                  style={ribbonBtn("#FFA500")}
                  onClick={() =>
                    exportCSV(
                      filteredBills.map((b) => ({
                        Contractor: getContractorName(b.contractorId),
                        Project: getProjectName(b.projectId),
                        "Bill No": b.billNo,
                        "Block ID": b.blockId || "",
                        Date: fmtDate(b.date),
                        Item: b.item,
                        Area: b.area,
                        Unit: b.unit,
                        "Unit Price": b.unitPrice,
                        "Gross Amount": b.grossAmount ?? b.area * b.unitPrice,
                        "WR %": b.workRetention || 0,
                        "WR Amount ₹": b.workRetentionAmount || 0,
                        "Net Amount (INR)": b.amount,
                        Remarks: b.remarks,
                      })),
                      [
                        "Contractor",
                        "Project",
                        "Bill No",
                        "Block ID",
                        "Date",
                        "Item",
                        "Area",
                        "Unit",
                        "Unit Price",
                        "Gross Amount",
                        "WR %",
                        "WR Amount ₹",
                        "Net Amount (INR)",
                        "Remarks",
                      ],
                      "contractor-bills.csv",
                    )
                  }
                  data-ocid="contractors.secondary_button"
                >
                  <Download size={13} />
                  Export CSV
                </button>
                {canManage && (
                  <button
                    type="button"
                    style={ribbonBtn("#555")}
                    onClick={() =>
                      downloadFormat(
                        [
                          "ContractorId",
                          "ProjectId",
                          "BillNo",
                          "BlockId",
                          "Date",
                          "Item",
                          "Area",
                          "Unit",
                          "UnitPrice",
                          "GrossAmount",
                          "WRPercent",
                          "WRAmount",
                          "NetAmount",
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
                )}
                {canManage && (
                  <button
                    type="button"
                    style={ribbonBtn("#0078D7")}
                    onClick={openAddBill}
                    data-ocid="contractors.primary_button"
                  >
                    <Plus size={13} />
                    New Bill
                  </button>
                )}
                {canManage && bSelected.length > 0 && (
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
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div
                style={{
                  background: "#E3F2FD",
                  border: "1px solid #0078D7",
                  borderRadius: "6px",
                  padding: "4px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0078D7",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                <div>Total SFT</div>
                <div style={{ fontSize: "15px" }}>
                  {totalAreaSft.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div
                style={{
                  background: "#FFEBEE",
                  border: "1px solid #D32F2F",
                  borderRadius: "6px",
                  padding: "4px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#D32F2F",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                <div>Total Bills: {fmtINR(totalBillsAmt)}</div>
                <div
                  style={{ fontSize: "11px", fontWeight: 400, color: "#888" }}
                >
                  {filteredBills.length} bill
                  {filteredBills.length !== 1 ? "s" : ""}
                </div>
              </div>
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
                setBFilter((f) => ({
                  ...f,
                  contractorId: e.target.value,
                  projectId: "",
                }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {bContractorOptions.map((c) => (
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
              {bProjectOptions.map((p) => (
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
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("contractor")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("contractor");
                    }}
                  >
                    Contractor{getBIcon("contractor")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("project")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("project");
                    }}
                  >
                    Project{getBIcon("project")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("billNo")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("billNo");
                    }}
                  >
                    Bill No{getBIcon("billNo")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("blockId")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("blockId");
                    }}
                  >
                    Block ID{getBIcon("blockId")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("date")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("date");
                    }}
                  >
                    Date{getBIcon("date")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("item")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("item");
                    }}
                  >
                    Item{getBIcon("item")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("area")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("area");
                    }}
                  >
                    Area{getBIcon("area")}
                  </th>
                  <th style={{ ...thStyle, background: "#D32F2F" }}>Unit</th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("unitPrice")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("unitPrice");
                    }}
                  >
                    Unit Price{getBIcon("unitPrice")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#1565c0",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("grossAmount")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("grossAmount");
                    }}
                  >
                    Gross Amt{getBIcon("grossAmount")}
                  </th>
                  <th style={{ ...thStyle, background: "#9c27b0" }}>WR %</th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#9c27b0",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("workRetention")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("workRetention");
                    }}
                  >
                    WR Amt ₹{getBIcon("workRetention")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#D32F2F",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleBSort("netAmount")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBSort("netAmount");
                    }}
                  >
                    Net Amount (INR){getBIcon("netAmount")}
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
                  applySortStr(filteredBills, bSortField, bSortDir, (b, f) => {
                    if (f === "contractor")
                      return (
                        getContractorName(b.contractorId) ?? ""
                      ).toLowerCase();
                    if (f === "project")
                      return (getProjectName(b.projectId) ?? "").toLowerCase();
                    if (f === "billNo") return b.billNo.toLowerCase();
                    if (f === "blockId") return (b.blockId ?? "").toLowerCase();
                    if (f === "date") return b.date;
                    if (f === "item") return b.item.toLowerCase();
                    if (f === "area") return b.area;
                    if (f === "unitPrice") return b.unitPrice;
                    if (f === "grossAmount")
                      return b.grossAmount ?? b.area * b.unitPrice;
                    if (f === "workRetention")
                      return b.workRetentionAmount ?? 0;
                    if (f === "netAmount") return b.amount;
                    return "";
                  }).map((b, i) => (
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
                        {b.blockId || "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? ZEBRA_BILL : "#fff",
                        }}
                      >
                        {fmtDate(b.date)}
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
                          background: i % 2 === 0 ? "#e3f0ff" : "#f0f7ff",
                          color: "#1565c0",
                          fontWeight: 700,
                        }}
                      >
                        {fmtINR(b.grossAmount ?? b.area * b.unitPrice)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? "#f9f0ff" : "#fdf5ff",
                          color: "#9c27b0",
                          fontWeight: 600,
                        }}
                      >
                        {b.workRetention || 0}%
                      </td>
                      <td
                        style={{
                          ...tdStyle(i % 2 === 0),
                          background: i % 2 === 0 ? "#f9f0ff" : "#fdf5ff",
                          color: "#9c27b0",
                          fontWeight: 700,
                        }}
                      >
                        {fmtINR(b.workRetentionAmount || 0)}
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
              <>
                <button
                  type="button"
                  style={ribbonBtn()}
                  onClick={() =>
                    printContent(
                      "Contractor Payments",
                      `<div class="summary"><div class="s-card s-green"><div class="lbl">Total Payments</div><div class="val">${fmtINR(totalPaymentsAmt)}</div></div></div>`,
                      `<table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Payment No</th><th>Date</th><th>Amount</th><th>Mode</th><th>Remarks</th></tr></thead><tbody>${filteredPayments.map((p, i) => `<tr><td>${i + 1}</td><td>${getContractorName(p.contractorId)}</td><td>${getProjectName(p.projectId)}</td><td>${p.paymentNo}</td><td>${fmtDate(p.date)}</td><td>${fmtINR(p.amount)}</td><td>${p.paymentMode}</td><td>${p.remarks}</td></tr>`).join("")}</tbody></table>`,
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
                      "Contractor Payments – Export PDF",
                      `<div class="summary"><div class="s-card s-green"><div class="lbl">Total Payments</div><div class="val">${fmtINR(totalPaymentsAmt)}</div></div></div>`,
                      `<table><thead><tr><th>#</th><th>Contractor</th><th>Project</th><th>Payment No</th><th>Date</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${filteredPayments.map((p, i) => `<tr><td>${i + 1}</td><td>${getContractorName(p.contractorId)}</td><td>${getProjectName(p.projectId)}</td><td>${p.paymentNo}</td><td>${fmtDate(p.date)}</td><td>${fmtINR(p.amount)}</td><td>${p.paymentMode}</td></tr>`).join("")}</tbody></table>`,
                    )
                  }
                  title="PDF"
                  data-ocid="contractors.secondary_button"
                >
                  <FileText size={13} />
                  PDF
                </button>
                {canManage && (
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
                )}
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
                      } catch (err) {
                        toast.error(`Import error: ${err}`);
                      }
                    });
                    setTimeout(() => {
                      queryClient.invalidateQueries({
                        queryKey: ["contractorPaymentsList"],
                      });
                      toast.success("Payments imported successfully");
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
                {canManage && (
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
                )}
                {canManage && (
                  <button
                    type="button"
                    style={ribbonBtn("#0078D7")}
                    onClick={openAddPayment}
                    data-ocid="contractors.primary_button"
                  >
                    <Plus size={13} />
                    New Payment
                  </button>
                )}
                {canManage && pSelected.length > 0 && (
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
                setPFilter((f) => ({
                  ...f,
                  contractorId: e.target.value,
                  projectId: "",
                }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {pContractorOptions.map((c) => (
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
              {pProjectOptions.map((p) => (
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
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("contractor")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("contractor");
                    }}
                  >
                    Contractor{getPIcon("contractor")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("project")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("project");
                    }}
                  >
                    Project{getPIcon("project")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("paymentNo")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("paymentNo");
                    }}
                  >
                    Payment No{getPIcon("paymentNo")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("date")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("date");
                    }}
                  >
                    Date{getPIcon("date")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("amount")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("amount");
                    }}
                  >
                    Amount (INR){getPIcon("amount")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#28A745",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handlePSort("mode")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePSort("mode");
                    }}
                  >
                    Mode{getPIcon("mode")}
                  </th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Remarks</th>
                  <th style={{ ...thStyle, background: "#28A745" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
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
                  applySortStr(
                    filteredPayments,
                    pSortField,
                    pSortDir,
                    (p, f) => {
                      if (f === "contractor")
                        return (
                          getContractorName(p.contractorId) ?? ""
                        ).toLowerCase();
                      if (f === "project")
                        return (
                          getProjectName(p.projectId) ?? ""
                        ).toLowerCase();
                      if (f === "paymentNo") return p.paymentNo.toLowerCase();
                      if (f === "date") return p.date;
                      if (f === "amount") return p.amount;
                      if (f === "mode") return p.paymentMode.toLowerCase();
                      return "";
                    },
                  ).map((p, i) => (
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
                        {fmtDate(p.date)}
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
                        `<tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}"><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${i + 1}</td><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(e.date)}</td><td style="padding:5px 8px;border:1px solid #ddd">${getContractorName(e.contractorId)}</td><td style="padding:5px 8px;border:1px solid #ddd">${getProjectName(e.projectId)}</td><td style="padding:5px 8px;border:1px solid #ddd">${e.desc}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#0078D7">${e.debit > 0 ? fmtINR(e.debit) : "—"}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#9c27b0">${fmtINR(e.workRetentionAmount || 0)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#28A745">${e.credit > 0 ? fmtINR(e.credit) : "—"}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${fmtINR(e.balance)}</td></tr>`,
                    )
                    .join("");
                  printContent(
                    "Contractor Ledger Report",
                    `<div class="summary"><div class="s-card s-blue"><div class="lbl">Total Bills</div><div class="val">${fmtINR(rTotalBills)}</div></div><div class="s-card s-green"><div class="lbl">Total Payments</div><div class="val">${fmtINR(rTotalPayments)}</div></div><div class="s-card ${(rTotalBills - rTotalPayments) < 0 ? "s-red" : "s-orange"}"><div class="lbl">Outstanding</div><div class="val">${fmtINR(rTotalBills - rTotalPayments)}</div></div><div class="s-card s-purple"><div class="lbl">Work Retention</div><div class="val">${fmtINR(rTotalWorkRetention)}</div></div></div>`,
                    `<table><thead><tr><th>#</th><th>Date</th><th>Contractor</th><th>Project</th><th>Description</th><th>Debit (Bills)</th><th>Work Retention ₹</th><th>Credit (Payments)</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`,
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
                  const pdfRows = ledgerEntries
                    .map(
                      (e, i) =>
                        `<tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}"><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${i + 1}</td><td style="padding:5px 8px;border:1px solid #ddd">${fmtDate(e.date)}</td><td style="padding:5px 8px;border:1px solid #ddd">${getContractorName(e.contractorId)}</td><td style="padding:5px 8px;border:1px solid #ddd">${getProjectName(e.projectId)}</td><td style="padding:5px 8px;border:1px solid #ddd">${e.desc}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#0078D7">${e.debit > 0 ? fmtINR(e.debit) : "—"}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#9c27b0">${fmtINR(e.workRetentionAmount || 0)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#28A745">${e.credit > 0 ? fmtINR(e.credit) : "—"}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${fmtINR(e.balance)}</td></tr>`,
                    )
                    .join("");
                  printContent(
                    "Contractor Ledger – PDF",
                    `<div class="summary"><div class="s-card s-blue"><div class="lbl">Total Bills</div><div class="val">${fmtINR(rTotalBills)}</div></div><div class="s-card s-green"><div class="lbl">Total Payments</div><div class="val">${fmtINR(rTotalPayments)}</div></div><div class="s-card s-orange"><div class="lbl">Outstanding</div><div class="val">${fmtINR(rTotalBills - rTotalPayments)}</div></div><div class="s-card s-purple"><div class="lbl">Work Retention</div><div class="val">${fmtINR(rTotalWorkRetention)}</div></div></div>`,
                    `<table><thead><tr><th>#</th><th>Date</th><th>Contractor</th><th>Project</th><th>Description</th><th>Debit</th><th>Work Retention ₹</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${pdfRows}</tbody></table>`,
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
                Bills (Gross): {fmtINR(rTotalBills)}
              </div>
              <div
                style={{
                  background: "#F3E5F5",
                  border: "1px solid #9c27b0",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#9c27b0",
                }}
              >
                Work Retention: {fmtINR(rTotalWorkRetention)}
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
                Outstanding:{" "}
                {fmtINR(rTotalBills - (rTotalWorkRetention + rTotalPayments))}
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
                setRFilter((f) => ({
                  ...f,
                  contractorId: e.target.value,
                  projectId: "",
                }))
              }
              data-ocid="contractors.select"
            >
              <option value="">All Contractors</option>
              {rContractorOptions.map((c) => (
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
              {rProjectOptions.map((p) => (
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
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("date")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("date");
                    }}
                  >
                    Date{getRIcon("date")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("contractor")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("contractor");
                    }}
                  >
                    Contractor{getRIcon("contractor")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("project")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("project");
                    }}
                  >
                    Project{getRIcon("project")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("desc")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("desc");
                    }}
                  >
                    Description{getRIcon("desc")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("debit")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("debit");
                    }}
                  >
                    Debit (Bills){getRIcon("debit")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      background: "#9c27b0",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("workRetention")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("workRetention");
                    }}
                  >
                    Work Retention ₹{getRIcon("workRetention")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("credit")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("credit");
                    }}
                  >
                    Credit (Payments){getRIcon("credit")}
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleRSort("balance")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRSort("balance");
                    }}
                  >
                    Balance{getRIcon("balance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
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
                  applySortStr(ledgerEntries, rSortField, rSortDir, (e, f) => {
                    if (f === "date") return e.date;
                    if (f === "contractor")
                      return (
                        getContractorName(e.contractorId) ?? ""
                      ).toLowerCase();
                    if (f === "project")
                      return (getProjectName(e.projectId) ?? "").toLowerCase();
                    if (f === "desc") return e.desc.toLowerCase();
                    if (f === "debit") return e.debit;
                    if (f === "workRetention") return e.workRetentionAmount;
                    if (f === "credit") return e.credit;
                    if (f === "balance") return e.balance;
                    return "";
                  }).map((e, i) => (
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
                        {fmtDate(e.date)}
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
                          color: e.workRetentionAmount > 0 ? "#9c27b0" : "#999",
                          fontWeight: e.workRetentionAmount > 0 ? 700 : 400,
                        }}
                      >
                        {e.workRetentionAmount > 0
                          ? fmtINR(e.workRetentionAmount)
                          : ""}
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
                onChange={(e) => {
                  const newProjectId = e.target.value;
                  setCForm((f) => {
                    const woNo = !cEditing
                      ? generateWoNo(
                          newProjectId,
                          f.date,
                          contractors.length + 1,
                        )
                      : f.woNo;
                    return { ...f, projectId: newProjectId, woNo };
                  });
                }}
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
                onChange={(e) => {
                  const newDate = e.target.value;
                  setCForm((f) => {
                    const woNo = !cEditing
                      ? generateWoNo(
                          f.projectId,
                          newDate,
                          contractors.length + 1,
                        )
                      : f.woNo;
                    return { ...f, date: newDate, woNo };
                  });
                }}
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                W.O No (Work Order Number)
              </Label>
              <Input
                value={cForm.woNo}
                onChange={(e) =>
                  setCForm((f) => ({ ...f, woNo: e.target.value }))
                }
                placeholder="Auto-generated"
                style={{
                  background: "#f0f8ff",
                  fontWeight: 700,
                  color: "#0078D7",
                }}
                data-ocid="contractors.input"
              />
              <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                Format: [Project 2 Letters][DD][MM][YY][Serial]. Auto-generated.
              </p>
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
              <Label className="text-xs mb-1 block">Link 1 - W.O.</Label>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <DialogTitle>Contractor Details</DialogTitle>
              {cViewItem && (
                <>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#0078D7",
                      padding: "4px",
                    }}
                    title="Print Receipt"
                    onClick={() =>
                      printReceipt("contractor", {
                        Name: cViewItem.name,
                        "Trade(s)": cViewItem.trades.join(", "),
                        Project: getProjectName(cViewItem.projectId),
                        Date: fmtDate(cViewItem.date),
                        "W.O No": cViewItem.woNo || "",
                        "Contracting Price": fmtINR(cViewItem.contractingPrice),
                        Unit: cViewItem.unit,
                        "Contact 1": cViewItem.contact1,
                        "Contact 2": cViewItem.contact2,
                        Email: cViewItem.email,
                        Address: cViewItem.address,
                        Note: cViewItem.note,
                        "Link 1 - W.O": cViewItem.link1,
                        "Link 2": cViewItem.link2,
                      })
                    }
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#555",
                      padding: "4px",
                    }}
                    title="Share"
                    onClick={() =>
                      shareReceipt("contractor", {
                        Name: cViewItem.name,
                        Trade: cViewItem.trades.join(", "),
                        Project: getProjectName(cViewItem.projectId),
                        Date: fmtDate(cViewItem.date),
                        "W.O No": cViewItem.woNo || "–",
                        "Contracting Price": fmtINR(cViewItem.contractingPrice),
                        Unit: cViewItem.unit,
                        "Contact No 1": cViewItem.contact1 || "–",
                        "Contact No 2": cViewItem.contact2 || "–",
                        "Email ID": cViewItem.email || "–",
                        "Link 1 - W.O": cViewItem.link1 || "–",
                        "Link 2": cViewItem.link2 || "–",
                        Address: cViewItem.address || "–",
                        Note: cViewItem.note || "–",
                      })
                    }
                  >
                    <Share2 size={16} />
                  </button>
                </>
              )}
            </div>
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
                {contractors
                  .filter((c) => !completedContractorIds.has(c.id))
                  .map((c) => (
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
                {projects
                  .filter((p) => !completedProjectIdSet.has(p.id))
                  .map((p) => (
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
              <Label className="text-xs mb-1 block">Block ID</Label>
              <Input
                value={bForm.blockId}
                onChange={(e) =>
                  setBForm((f) => ({ ...f, blockId: e.target.value }))
                }
                placeholder="Block ID (optional)"
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
                onChange={(e) => {
                  const area = Number.parseFloat(e.target.value) || 0;
                  const grossAmt = area * bForm.unitPrice;
                  const amt = grossAmt * (1 - bForm.workRetention / 100);
                  const wrAmt = grossAmt * (bForm.workRetention / 100);
                  setBForm((f) => ({
                    ...f,
                    area,
                    grossAmount: grossAmt,
                    amount: amt,
                    workRetentionAmount: wrAmt,
                  }));
                }}
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
                onChange={(e) => {
                  const up = Number.parseFloat(e.target.value) || 0;
                  const grossAmt = bForm.area * up;
                  const amt = grossAmt * (1 - bForm.workRetention / 100);
                  const wrAmt = grossAmt * (bForm.workRetention / 100);
                  setBForm((f) => ({
                    ...f,
                    unitPrice: up,
                    grossAmount: grossAmt,
                    amount: amt,
                    workRetentionAmount: wrAmt,
                  }));
                }}
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Work Retention %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                value={bForm.workRetention}
                onChange={(e) => {
                  const wr = Number.parseFloat(e.target.value) || 0;
                  const grossAmt = bForm.area * bForm.unitPrice;
                  const amt = grossAmt * (1 - wr / 100);
                  const wrAmt = grossAmt * (wr / 100);
                  setBForm((f) => ({
                    ...f,
                    workRetention: wr,
                    grossAmount: grossAmt,
                    amount: amt,
                    workRetentionAmount: wrAmt,
                  }));
                }}
                data-ocid="contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Amount (Auto) ₹</Label>
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
                {fmtINR(
                  bForm.area *
                    bForm.unitPrice *
                    (1 - bForm.workRetention / 100),
                )}
              </div>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                Area × Unit Price × (1 − WR% / 100)
              </p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                Work Retention Amount (Auto) ₹
              </Label>
              <div
                style={{
                  padding: "8px 12px",
                  background: "#faf0ff",
                  border: "1px solid #9c27b0",
                  borderRadius: "4px",
                  fontWeight: 700,
                  color: "#9c27b0",
                  fontSize: "13px",
                }}
              >
                {fmtINR(
                  bForm.area * bForm.unitPrice * (bForm.workRetention / 100),
                )}
              </div>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                Amount to deduct = Area × Unit Price × (WR% / 100)
              </p>
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
      <Dialog
        open={bViewOpen}
        onOpenChange={(open) => {
          if (!open) setBViewOpen(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="contractors.modal">
          <DialogHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <DialogTitle>Bill Details</DialogTitle>
              {bViewItem && (
                <>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#FFA500",
                      padding: "4px",
                    }}
                    title="Print Receipt"
                    onClick={() =>
                      printReceipt("bill", {
                        Contractor: getContractorName(bViewItem.contractorId),
                        Project: getProjectName(bViewItem.projectId),
                        "Bill No": bViewItem.billNo,
                        "Block ID": bViewItem.blockId || "—",
                        Date: fmtDate(bViewItem.date),
                        Item: bViewItem.item,
                        Area: String(bViewItem.area),
                        Unit: bViewItem.unit,
                        "Unit Price": fmtINR(bViewItem.unitPrice),
                        "Gross Amount": fmtINR(
                          bViewItem.grossAmount ??
                            bViewItem.area * bViewItem.unitPrice,
                        ),
                        "Work Retention %": `${bViewItem.workRetention || 0}%`,
                        "Work Retention Amount": fmtINR(
                          bViewItem.workRetentionAmount || 0,
                        ),
                        "Net Amount (INR)": fmtINR(bViewItem.amount),
                        Remarks: bViewItem.remarks,
                      })
                    }
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#555",
                      padding: "4px",
                    }}
                    title="Share"
                    onClick={() =>
                      shareReceipt("bill", {
                        Contractor: getContractorName(bViewItem.contractorId),
                        Project: getProjectName(bViewItem.projectId),
                        "Bill No": bViewItem.billNo,
                        "Block ID": bViewItem.blockId || "–",
                        Date: fmtDate(bViewItem.date),
                        Item: bViewItem.item || "–",
                        Area: String(bViewItem.area),
                        Unit: bViewItem.unit,
                        "Unit Price": fmtINR(bViewItem.unitPrice),
                        "Work Retention %": `${bViewItem.workRetention || 0}%`,
                        "Work Retention Amount": fmtINR(
                          bViewItem.workRetentionAmount || 0,
                        ),
                        "Amount (Net)": fmtINR(bViewItem.amount),
                        Remarks: bViewItem.remarks || "–",
                      })
                    }
                  >
                    <Share2 size={16} />
                  </button>
                </>
              )}
            </div>
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
                { k: "Block ID", v: bViewItem.blockId || "—" },
                { k: "Date", v: bViewItem.date },
                { k: "Item", v: bViewItem.item },
                { k: "Area", v: String(bViewItem.area) },
                { k: "Unit", v: bViewItem.unit },
                { k: "Unit Price", v: fmtINR(bViewItem.unitPrice) },
                {
                  k: "Work Retention %",
                  v: `${bViewItem.workRetention || 0}%`,
                },
                {
                  k: "Work Retention Amount",
                  v: fmtINR(bViewItem.workRetentionAmount || 0),
                },
                { k: "Amount (Net)", v: fmtINR(bViewItem.amount) },
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
                {contractors
                  .filter((c) => !completedContractorIds.has(c.id))
                  .map((c) => (
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
                {projects
                  .filter((p) => !completedProjectIdSet.has(p.id))
                  .map((p) => (
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
                readOnly={!pEditing}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, paymentNo: e.target.value }))
                }
                style={{
                  background: pEditing ? undefined : "#f0f8ff",
                  fontWeight: 700,
                  color: "#0078D7",
                }}
                data-ocid="contractors.input"
              />
              {!pEditing && (
                <p
                  style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}
                >
                  Auto-generated serial number
                </p>
              )}
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
      <Dialog
        open={pViewOpen}
        onOpenChange={(open) => {
          if (!open) setPViewOpen(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="contractors.modal">
          <DialogHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <DialogTitle>Payment Details</DialogTitle>
              {pViewItem && (
                <>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#28A745",
                      padding: "4px",
                    }}
                    title="Print Receipt"
                    onClick={() =>
                      printReceipt("payment", {
                        Contractor: getContractorName(pViewItem.contractorId),
                        Project: getProjectName(pViewItem.projectId),
                        "Payment No": pViewItem.paymentNo,
                        Date: fmtDate(pViewItem.date),
                        Amount: fmtINR(pViewItem.amount),
                        Mode: pViewItem.paymentMode,
                        Remarks: pViewItem.remarks,
                      })
                    }
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#555",
                      padding: "4px",
                    }}
                    title="Share"
                    onClick={() =>
                      shareReceipt("payment", {
                        Contractor: getContractorName(pViewItem.contractorId),
                        Project: getProjectName(pViewItem.projectId),
                        "Payment No": pViewItem.paymentNo,
                        Date: fmtDate(pViewItem.date),
                        Amount: fmtINR(pViewItem.amount),
                        "Payment Mode":
                          pViewItem.paymentMode === "account"
                            ? "Account"
                            : "Cash",
                        Remarks: pViewItem.remarks || "–",
                      })
                    }
                  >
                    <Share2 size={16} />
                  </button>
                </>
              )}
            </div>
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
            cEditPwdRef.current = pwd;
            await handleContractorEditPwd(pwd);
          }
        }}
      />
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
            bEditPwdRef.current = pwd;
            const b = bPwdAction.data as ContractorBillRecord;
            setBEditing(b);
            setBForm({
              contractorId: b.contractorId,
              projectId: b.projectId,
              billNo: b.billNo,
              blockId: b.blockId || "",
              date: b.date,
              item: b.item,
              area: b.area,
              unit: b.unit,
              unitPrice: b.unitPrice,
              workRetention: b.workRetention || 0,
              workRetentionAmount: b.workRetentionAmount || 0,
              amount: b.amount,
              grossAmount: b.grossAmount ?? b.area * b.unitPrice,
              remarks: b.remarks,
            });
            setBPwdAction(null);
            setBFormOpen(true);
          }
        }}
      />
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
            pEditPwdRef.current = pwd;
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
