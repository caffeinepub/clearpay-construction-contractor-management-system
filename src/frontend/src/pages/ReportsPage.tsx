import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CreditCard,
  Download,
  FileDown,
  FileText,
  Printer,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MultiSelectFilter } from "../components/MultiSelectFilter";
import {
  useGetAllBills,
  useGetAllPayments,
  useGetAllProjects,
} from "../hooks/useQueries";

interface LedgerEntry {
  id: string;
  date: string;
  dateSort: number;
  type: "BILL" | "PAYMENT";
  project: string;
  projectId: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
}

function fmtDateDMY(d: string): string {
  if (!d) return "";
  const p = d.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
  return d;
}
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);

const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const ddmmyyyy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`).getTime();
  }
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const isInDateRange = (
  dateStr: string,
  fromDate: string,
  toDate: string,
): boolean => {
  const ts = parseDateToTimestamp(dateStr);
  if (!ts) return true;
  if (fromDate) {
    const from = new Date(fromDate).getTime();
    if (ts < from) return false;
  }
  if (toDate) {
    const to = new Date(toDate).getTime() + 86400000;
    if (ts > to) return false;
  }
  return true;
};

export default function ReportsPage() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const chartRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );

  const { data: projects = [] } = useGetAllProjects();
  const { data: bills = [] } = useGetAllBills();
  const { data: payments = [] } = useGetAllPayments();

  const getProjectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name || projectId;

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field)
      return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === "asc")
      return (
        <ArrowUp className="inline h-3 w-3 ml-1" style={{ color: "#0078D7" }} />
      );
    return (
      <ArrowDown className="inline h-3 w-3 ml-1" style={{ color: "#0078D7" }} />
    );
  };

  const billEntries: LedgerEntry[] = bills
    .filter((b) => {
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(b.projectId)
      )
        return false;
      return isInDateRange(b.date, fromDate, toDate);
    })
    .map((b) => ({
      id: `bill-${b.projectId}-${b.billNumber}`,
      date: b.date,
      dateSort: parseDateToTimestamp(b.date),
      type: "BILL" as const,
      project: getProjectName(b.projectId),
      projectId: b.projectId,
      reference: b.billNumber,
      description: b.description || b.blockId || "",
      debit: Number(b.amount),
      credit: 0,
    }));

  const paymentEntries: LedgerEntry[] = payments
    .filter((p) => {
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(p.projectId)
      )
        return false;
      return isInDateRange(p.date, fromDate, toDate);
    })
    .map((p) => ({
      id: `pay-${p.id}`,
      date: p.date,
      dateSort: parseDateToTimestamp(p.date),
      type: "PAYMENT" as const,
      project: getProjectName(p.projectId),
      projectId: p.projectId,
      reference: p.reference || p.id,
      description: p.paymentMode || "",
      debit: 0,
      credit: Number(p.amount),
    }));

  const allEntries = [...billEntries, ...paymentEntries].sort(
    (a, b) => a.dateSort - b.dateSort,
  );

  let runningBalance = 0;
  const ledgerWithBalance = allEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  // Apply column sort to ledger
  const sortedLedger = (() => {
    if (!sortField || !sortDirection) return ledgerWithBalance;
    return [...ledgerWithBalance].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sortField) {
        case "date":
          aVal = a.dateSort;
          bVal = b.dateSort;
          break;
        case "type":
          aVal = a.type;
          bVal = b.type;
          break;
        case "project":
          aVal = (a.project ?? "").toLowerCase();
          bVal = (b.project ?? "").toLowerCase();
          break;
        case "reference":
          aVal = (a.reference ?? "").toLowerCase();
          bVal = (b.reference ?? "").toLowerCase();
          break;
        case "description":
          aVal = (a.description ?? "").toLowerCase();
          bVal = (b.description ?? "").toLowerCase();
          break;
        case "debit":
          aVal = a.debit;
          bVal = b.debit;
          break;
        case "credit":
          aVal = a.credit;
          bVal = b.credit;
          break;
        case "balance":
          aVal = a.balance;
          bVal = b.balance;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  })();

  const totalDebit = allEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = allEntries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;
  const totalGst = finalBalance > 0 ? (finalBalance * 18) / 100 : 0;

  // Chart data
  const projectChartMap: Record<
    string,
    { project: string; bills: number; payments: number }
  > = {};
  for (const e of billEntries) {
    if (!projectChartMap[e.projectId])
      projectChartMap[e.projectId] = {
        project: e.project,
        bills: 0,
        payments: 0,
      };
    projectChartMap[e.projectId].bills += e.debit;
  }
  for (const e of paymentEntries) {
    if (!projectChartMap[e.projectId])
      projectChartMap[e.projectId] = {
        project: e.project,
        bills: 0,
        payments: 0,
      };
    projectChartMap[e.projectId].payments += e.credit;
  }
  const chartData = Object.values(projectChartMap).map((d) => ({
    project:
      d.project.length > 14 ? `${d.project.substring(0, 14)}…` : d.project,
    Bills: Math.round(d.bills),
    Payments: Math.round(d.payments),
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, label: p.name }));

  const handleClearFilters = () => {
    setSelectedProjects([]);
    setFromDate("");
    setToDate("");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "#",
      "Date",
      "Type",
      "Project",
      "Bill No / Reference",
      "Description",
      "Debit (INR)",
      "Credit (INR)",
      "Balance (INR)",
    ];
    const rows = ledgerWithBalance.map((e, i) => [
      i + 1,
      e.date,
      e.type,
      e.project,
      e.reference,
      e.description,
      e.debit || "",
      e.credit || "",
      e.balance,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BMS_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print / PDF — open a new window with full data + chart table
  const handlePrintOrPDF = (isPDF = false) => {
    const summaryRows = Object.values(projectChartMap)
      .map(
        (d) =>
          `<tr>
            <td style="padding:6px 10px;border:1px solid #ddd">${d.project}</td>
            <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;color:#0078D7">₹${d.bills.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;color:#28A745">₹${d.payments.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;color:${d.bills - d.payments < 0 ? "#D32F2F" : "#FFA500"}">₹${(d.bills - d.payments).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>`,
      )
      .join("");

    const ledgerRows = ledgerWithBalance
      .map((e, i) => {
        const isCreditNeg = e.credit < 0;
        const isNegBal = e.balance < 0;
        const rowBg = isCreditNeg
          ? "#FFF8E1"
          : isNegBal
            ? "#FFF9C4"
            : e.type === "BILL"
              ? "#FFEBEE"
              : "#E8F5E9";
        return `<tr style="background:${rowBg}">
            <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
            <td style="padding:5px 8px;border:1px solid #ddd">${fmtDateDMY(e.date)}</td>
            <td style="padding:5px 8px;border:1px solid #ddd">
              <span style="background:${e.type === "BILL" ? "#FFEBEE" : "#E8F5E9"};color:${e.type === "BILL" ? "#D32F2F" : "#28A745"};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold">${e.type}</span>
            </td>
            <td style="padding:5px 8px;border:1px solid #ddd">${e.project}</td>
            <td style="padding:5px 8px;border:1px solid #ddd">${e.reference}</td>
            <td style="padding:5px 8px;border:1px solid #ddd">${e.description}</td>
            <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#0078D7">${e.debit > 0 ? `₹${e.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
            <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:${isCreditNeg ? "#D32F2F" : "#28A745"}">${e.credit !== 0 ? `₹${e.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
            <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:600;color:${isNegBal ? "#D32F2F" : "#333"}">₹${e.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>`;
      })
      .join("");

    const filterInfo = [
      selectedProjects.length > 0
        ? `Projects: ${selectedProjects.map(getProjectName).join(", ")}`
        : "All Projects",
      fromDate ? `From: ${fromDate}` : "",
      toDate ? `To: ${toDate}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BMS — Ledger Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Century Gothic', Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
    h1 { font-size: 20px; color: #0078D7; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #333; font-weight: bold; margin: 18px 0 8px; }
    .header-bar { border-bottom: 2px solid #0078D7; padding-bottom: 10px; margin-bottom: 16px; }
    .meta { font-size: 10px; color: #555; margin-top: 4px; }
    .summary-cards { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .card { flex: 1; min-width: 160px; border-radius: 6px; padding: 10px 14px; border: 1px solid #ddd; }
    .card .label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 4px; }
    .card .value { font-size: 15px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead tr { background: #0078D7; color: white; }
    thead th { padding: 7px 8px; text-align: left; font-weight: bold; border: 1px solid #0060b0; }
    tbody tr:last-child { font-weight: bold; background: #f0f4ff !important; border-top: 2px solid #0078D7; }
    .chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 120px; padding: 0 10px; margin-bottom: 4px; }
    .bar-group { display: flex; gap: 2px; align-items: flex-end; flex: 1; flex-direction: column; align-items: center; }
    .bar { width: 100%; max-width: 30px; min-height: 2px; border-radius: 3px 3px 0 0; }
    @media print {
      body { padding: 10px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1>BMS — Ledger Report</h1>
    <p class="meta">Generated: ${new Date().toLocaleString("en-IN")} &nbsp;|&nbsp; ${filterInfo}</p>
  </div>

  <div class="summary-cards">
    <div class="card" style="background:#E3F2FD;border-color:#90CAF9">
      <div class="label">Total Bills</div>
      <div class="value" style="color:#0078D7">${formatCurrency(totalDebit)}</div>
      <div style="font-size:9px;color:#555;margin-top:2px">${billEntries.length} bills</div>
    </div>
    <div class="card" style="background:#E8F5E9;border-color:#A5D6A7">
      <div class="label">Total Payments</div>
      <div class="value" style="color:#28A745">${formatCurrency(totalCredit)}</div>
      <div style="font-size:9px;color:#555;margin-top:2px">${paymentEntries.length} payments</div>
    </div>
    <div class="card" style="background:#FFF3E0;border-color:#FFCC80">
      <div class="label">Outstanding</div>
      <div class="value" style="color:#FFA500">${formatCurrency(finalBalance > 0 ? finalBalance : 0)}</div>
      <div style="font-size:9px;color:#555;margin-top:2px">Pending amount</div>
    </div>
    <div class="card" style="background:#F3E5F5;border-color:#CE93D8">
      <div class="label">GST 18%</div>
      <div class="value" style="color:#9C27B0">${formatCurrency(totalGst)}</div>
      <div style="font-size:9px;color:#555;margin-top:2px">On outstanding</div>
    </div>
  </div>

  ${
    chartData.length > 0
      ? `
  <h2>Project-wise Bills vs Payments</h2>
  <table style="margin-bottom:20px">
    <thead>
      <tr>
        <th>Project</th>
        <th style="text-align:right">Total Bills (₹)</th>
        <th style="text-align:right">Total Payments (₹)</th>
        <th style="text-align:right">Outstanding (₹)</th>
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
  </table>
  `
      : ""
  }

  <h2>Ledger — Bills &amp; Payments</h2>
  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center">#</th>
        <th>Date</th>
        <th>Type</th>
        <th>Project</th>
        <th>Bill No / Reference</th>
        <th>Description</th>
        <th style="text-align:right">Debit (₹)</th>
        <th style="text-align:right">Credit (₹)</th>
        <th style="text-align:right">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${ledgerRows}
      ${
        ledgerWithBalance.length > 0
          ? `
      <tr>
        <td colspan="6" style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;color:#0078D7">TOTALS</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#0078D7">₹${totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#28A745">₹${totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:${finalBalance < 0 ? "#D32F2F" : "#333"}">₹${finalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>`
          : ""
      }
    </tbody>
  </table>

  <script>
    window.onload = function() {
      ${isPDF ? "window.print();" : "window.print();"}
    };
  <\/script>
</body>
</html>`;

    const pw = window.open("", "_blank", "width=1200,height=900");
    if (pw) {
      pw.document.write(html);
      pw.document.close();
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col min-h-screen">
        {/* Sticky Toolbar */}
        <div
          className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 shadow-sm"
          style={{ fontFamily: "'Century Gothic', sans-serif" }}
        >
          <h1
            className="text-xl font-bold text-[#0078D7] mr-auto"
            style={{ fontFamily: "'Century Gothic', sans-serif" }}
          >
            📋 Reports — Ledger
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-[#0078D7] text-[#0078D7] hover:bg-blue-50"
            onClick={() => handlePrintOrPDF(false)}
            data-ocid="reports.print_button"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-[#D32F2F] text-[#D32F2F] hover:bg-red-50"
            onClick={() => handlePrintOrPDF(true)}
            data-ocid="reports.secondary_button"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-[#28A745] text-[#28A745] hover:bg-green-50"
            onClick={handleExportCSV}
            data-ocid="reports.upload_button"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div
          className="p-6 space-y-5"
          style={{ fontFamily: "'Century Gothic', sans-serif" }}
        >
          {/* Filter Card */}
          <Card className="no-print shadow-sm border-gray-200">
            <CardContent className="pt-4 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <Label className="text-xs font-semibold text-[#555555] mb-1.5 block uppercase tracking-wide">
                    Projects
                  </Label>
                  <MultiSelectFilter
                    options={projectOptions}
                    selectedIds={selectedProjects}
                    onChange={setSelectedProjects}
                    placeholder="All Projects"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#555555] mb-1.5 block uppercase tracking-wide">
                    From Date
                  </Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-sm"
                    data-ocid="reports.input"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#555555] mb-1.5 block uppercase tracking-wide">
                    To Date
                  </Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#555555]">
                  Showing <strong>{ledgerWithBalance.length}</strong> records
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-[#555555] hover:text-[#D32F2F] flex items-center gap-1"
                  data-ocid="reports.secondary_button"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  Total Bills
                </CardTitle>
                <FileText className="h-4 w-4 text-[#0078D7]" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold text-[#0078D7]">
                  {formatCurrency(totalDebit)}
                </div>
                <p className="text-xs text-[#555555] mt-0.5">
                  {billEntries.length} bills
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  Total Payments
                </CardTitle>
                <CreditCard className="h-4 w-4 text-[#28A745]" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold text-[#28A745]">
                  {formatCurrency(totalCredit)}
                </div>
                <p className="text-xs text-[#555555] mt-0.5">
                  {paymentEntries.length} payments
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  Outstanding
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-[#FFA500]" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold text-[#FFA500]">
                  {formatCurrency(finalBalance > 0 ? finalBalance : 0)}
                </div>
                <p className="text-xs text-[#555555] mt-0.5">Pending amount</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  GST 18%
                </CardTitle>
                <Receipt className="h-4 w-4 text-[#9C27B0]" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold text-[#9C27B0]">
                  {formatCurrency(totalGst)}
                </div>
                <p className="text-xs text-[#555555] mt-0.5">On outstanding</p>
              </CardContent>
            </Card>
          </div>

          {/* Bar Chart (always visible on screen) */}
          {chartData.length > 0 && (
            <Card className="shadow-sm border-gray-200" ref={chartRef}>
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle
                  className="text-base font-bold text-[#0078D7]"
                  style={{ fontFamily: "'Century Gothic', sans-serif" }}
                >
                  Project-wise Bills vs Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="project"
                      tick={{
                        fontSize: 10,
                        fontFamily: "Century Gothic, sans-serif",
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "11px",
                        fontFamily: "Century Gothic, sans-serif",
                      }}
                    />
                    <Bar dataKey="Bills" fill="#0078D7" radius={[3, 3, 0, 0]} />
                    <Bar
                      dataKey="Payments"
                      fill="#28A745"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Ledger Table */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <CardTitle
                className="text-base font-bold text-[#0078D7]"
                style={{ fontFamily: "'Century Gothic', sans-serif" }}
              >
                Ledger — Bills &amp; Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="ledger-table text-sm">
                  <TableHeader>
                    <TableRow className="bg-[#0078D7] hover:bg-[#0078D7]">
                      <TableHead className="text-white font-bold w-10 text-center">
                        #
                      </TableHead>
                      <TableHead
                        className="text-white font-bold cursor-pointer select-none"
                        onClick={() => handleSort("date")}
                      >
                        Date{getSortIcon("date")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold cursor-pointer select-none"
                        onClick={() => handleSort("type")}
                      >
                        Type{getSortIcon("type")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold cursor-pointer select-none"
                        onClick={() => handleSort("project")}
                      >
                        Project{getSortIcon("project")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold cursor-pointer select-none"
                        onClick={() => handleSort("reference")}
                      >
                        Bill No / Reference{getSortIcon("reference")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold cursor-pointer select-none"
                        onClick={() => handleSort("description")}
                      >
                        Description{getSortIcon("description")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold text-right cursor-pointer select-none"
                        onClick={() => handleSort("debit")}
                      >
                        Debit (₹){getSortIcon("debit")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold text-right cursor-pointer select-none"
                        onClick={() => handleSort("credit")}
                      >
                        Credit (₹){getSortIcon("credit")}
                      </TableHead>
                      <TableHead
                        className="text-white font-bold text-right cursor-pointer select-none"
                        onClick={() => handleSort("balance")}
                      >
                        Balance (₹){getSortIcon("balance")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerWithBalance.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-12 text-[#555555]"
                          data-ocid="reports.empty_state"
                        >
                          No records found. Adjust filters or add Bills &
                          Payments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedLedger.map((entry, idx) => {
                        const isCreditNeg = entry.credit < 0;
                        const isNegBal = entry.balance < 0;
                        // Row background: negative credit = beige, negative balance = yellow, else type color
                        const rowBg = isCreditNeg
                          ? "#FFF8E1"
                          : isNegBal
                            ? "#FFF9C4"
                            : entry.type === "BILL"
                              ? "#FFEBEE"
                              : "#E8F5E9";
                        return (
                          <TableRow
                            key={entry.id}
                            style={{ backgroundColor: rowBg }}
                            className="hover:brightness-95 transition-all"
                            data-ocid={`reports.item.${idx + 1}`}
                          >
                            <TableCell className="text-center text-[#555555] text-xs">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-[#555555] whitespace-nowrap">
                              {fmtDateDMY(entry.date)}
                            </TableCell>
                            <TableCell>
                              {entry.type === "BILL" ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-[#D32F2F] border border-red-300 hover:bg-red-100">
                                  BILL
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-[#28A745] border border-green-300 hover:bg-green-100">
                                  PAYMENT
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-[#555555] max-w-[140px] truncate">
                              {entry.project}
                            </TableCell>
                            <TableCell className="text-[#555555]">
                              {entry.reference}
                            </TableCell>
                            <TableCell className="text-[#555555] max-w-[160px] truncate">
                              {entry.description}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.debit > 0 ? (
                                <span className="text-[#0078D7]">
                                  {formatCurrency(entry.debit)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.credit !== 0 ? (
                                <span
                                  style={{
                                    color: isCreditNeg ? "#D32F2F" : "#28A745",
                                    fontWeight: isCreditNeg ? 700 : 500,
                                  }}
                                >
                                  {formatCurrency(entry.credit)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell
                              className="text-right font-semibold"
                              style={{ color: isNegBal ? "#D32F2F" : "#333" }}
                            >
                              {formatCurrency(entry.balance)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}

                    {ledgerWithBalance.length > 0 && (
                      <TableRow className="bg-gray-100 border-t-2 border-[#0078D7]">
                        <TableCell
                          colSpan={6}
                          className="font-bold text-[#0078D7] text-sm"
                        >
                          TOTALS
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#0078D7]">
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#28A745]">
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell
                          className="text-right font-bold text-sm"
                          style={{
                            color: finalBalance < 0 ? "#D32F2F" : "#333",
                          }}
                        >
                          {formatCurrency(finalBalance)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
