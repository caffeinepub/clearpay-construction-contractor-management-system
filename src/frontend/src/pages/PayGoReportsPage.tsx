import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";

export default function PayGoReportsPage() {
  const { projects, payments } = usePayGo();
  const [filterProject, setFilterProject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredPayments = payments.filter((p) => {
    if (filterProject && p.project !== filterProject) return false;
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });

  const totalBudget = (
    filterProject ? projects.filter((p) => p.name === filterProject) : projects
  ).reduce((s, p) => s + p.budget, 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, totalBudget - totalPaid);

  const fmtDate = (d: string) => (d ? d.split("-").reverse().join("-") : "");

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><title>PayGo Report</title><style>body{font-family:'Century Gothic',sans-serif;font-size:12px;margin:20px;}h1{color:#28A745;}table{width:100%;border-collapse:collapse;}th{background:#28A745;color:#fff;padding:6px 8px;text-align:left;font-size:11px;}td{padding:5px 8px;border-bottom:1px solid #eee;}.summary{display:flex;gap:16px;margin:12px 0;}.box{background:#f0fff4;border:1px solid #c3e6cb;border-radius:6px;padding:10px 16px;text-align:center;}.box-label{font-size:10px;color:#555;font-weight:600;text-transform:uppercase;}.box-value{font-size:16px;font-weight:bold;color:#28A745;}</style></head><body><h1>PayGo – Financial Report</h1><div class="summary"><div class="box"><div class="box-label">Total Budget</div><div class="box-value">${formatINR(totalBudget)}</div></div><div class="box"><div class="box-label">Total Paid</div><div class="box-value">${formatINR(totalPaid)}</div></div><div class="box"><div class="box-label">Outstanding</div><div class="box-value" style="color:#D32F2F">${formatINR(outstanding)}</div></div></div><table><thead><tr><th>#</th><th>Payment No</th><th>Project</th><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th><th>Remarks</th></tr></thead><tbody>${filteredPayments.map((p, i) => `<tr><td>${i + 1}</td><td>${p.paymentNo}</td><td>${p.project}</td><td>${fmtDate(p.date)}</td><td>${formatINR(p.amount)}</td><td>${p.paymentMode}</td><td>${p.status}</td><td>${p.remarks}</td></tr>`).join("")}</tbody></table></body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const exportCSV = () => {
    const headers = [
      "#",
      "Payment No",
      "Project",
      "Date",
      "Amount",
      "Mode",
      "Status",
      "Remarks",
    ];
    const rows = filteredPayments.map((p, i) => [
      i + 1,
      p.paymentNo,
      p.project,
      fmtDate(p.date),
      p.amount,
      p.paymentMode,
      p.status,
      p.remarks,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-report.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Budget",
            value: formatINR(totalBudget),
            color: "#0078D7",
          },
          { label: "Total Paid", value: formatINR(totalPaid), color: GREEN },
          {
            label: "Outstanding",
            value: formatINR(outstanding),
            color: outstanding > 0 ? "#D32F2F" : GREEN,
          },
        ].map((s) => (
          <Card
            key={s.label}
            className="border-l-4"
            style={{ borderLeftColor: s.color }}
          >
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-gray-500 font-semibold uppercase">
                {s.label}
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Actions */}
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Project:</span>
          <Select
            value={filterProject || "all"}
            onValueChange={(v) => setFilterProject(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs h-8"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={exportCSV}
            style={{ background: GREEN, color: "#fff" }}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
            Payment Ledger ({filteredPayments.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: GREEN }}>
                {[
                  "#",
                  "Payment No",
                  "Project",
                  "Date",
                  "Amount",
                  "Mode",
                  "Status",
                  "Remarks",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                  >
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td
                      className="px-4 py-2 font-medium"
                      style={{ color: GREEN }}
                    >
                      {p.paymentNo}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{p.project}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {fmtDate(p.date)}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.paymentMode}</td>
                    <td className="px-4 py-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            p.status === "Completed"
                              ? "#d4edda"
                              : p.status === "Pending"
                                ? "#fff3cd"
                                : "#cce5ff",
                          color:
                            p.status === "Completed"
                              ? "#155724"
                              : p.status === "Pending"
                                ? "#856404"
                                : "#004085",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {p.remarks}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
