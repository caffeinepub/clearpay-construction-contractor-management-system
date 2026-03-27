import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { canManageData } from "@/lib/authAdmin";
import { formatINR } from "@/utils/money";
function fmtDateDMY(d: string): string {
  if (!d) return "";
  const p = d.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
  return d;
}
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  FileDown,
  FileUp,
  Filter,
  Pencil,
  Plus,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Payment, PaymentMode } from "../backend";
import { ActionButton } from "../components/ActionButton";
import { BulkDeleteButton } from "../components/BulkDeleteButton";
import { DateInput } from "../components/DateInput";
import { MultiSelectFilter } from "../components/MultiSelectFilter";
import { PasswordConfirmModal } from "../components/PasswordConfirmModal";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import {
  useAddPayment,
  useBulkDeletePayments,
  useDeletePayment,
  useGetAllPayments,
  useGetAllProjects,
  useGetCallerUserProfile,
  useGetCompletedProjectIds,
  useUpdatePayment,
} from "../hooks/useQueries";
import {
  downloadPaymentsTemplate,
  exportPaymentsToPDF,
  exportToCSV,
  formatPaymentsForExport,
  parseCSV,
  validatePaymentCSVData,
} from "../lib/exportUtils";

type SortField =
  | "date"
  | "project"
  | "paymentAmount"
  | "paymentMode"
  | "reference";
type SortDirection = "asc" | "desc" | null;

function printPaymentReceipt(data: Record<string, string>) {
  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:600;color:#555;width:45%;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0">${v}</td></tr>`,
    )
    .join("");
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Receipt</title><style>
    @page{size:A5;margin:10mm}
    body{font-family:'Century Gothic',Arial,sans-serif;margin:0;padding:0;width:148mm;min-height:210mm;background:#fff}
    .header{background:#0078D7;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
    .header h1{margin:0;font-size:18px;font-weight:700}
    .header small{font-size:11px;opacity:.85}
    .body{border:3px solid #28A745;margin:12px;padding:12px;background:#E8F5E9;border-radius:4px}
    .body h2{margin:0 0 10px;color:#28A745;font-size:14px;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:12px}
    .footer{text-align:center;font-size:10px;color:#888;padding:10px;margin-top:10px;border-top:1px solid #eee}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="header"><h1>ClearPay</h1><small>MKT Constructions</small></div>
    <div class="body"><h2>Payment Receipt</h2><table>${rows}</table></div>
    <div class="footer">© 2025 ClearPay. Powered by Seri AI.</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export default function PaymentsPage() {
  const _navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteConfirmPayment, setDeleteConfirmPayment] = useState<
    string | null
  >(null);
  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    paymentDate: "",
    projectId: "",
    paymentAmount: 0,
    paymentMode: PaymentMode.account,
    reference: "",
    remarks: "",
  });

  const { data: payments = [] } = useGetAllPayments();
  const { data: projects = [] } = useGetAllProjects();
  const { data: completedProjectIds = [] } = useGetCompletedProjectIds();
  const { data: currentUser } = useGetCallerUserProfile();
  const addPayment = useAddPayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const bulkDeletePayments = useBulkDeletePayments();

  // CRITICAL: Check if user can manage data (Master Admin or Admin role)
  const canManage = canManageData(currentUser?.email, currentUser?.role);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-40" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1 inline text-[#0078D7]" />;
    }
    return <ArrowDown className="h-4 w-4 ml-1 inline text-[#0078D7]" />;
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || "Unknown";
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments.filter((payment) => {
      if (
        completedProjectIds.length > 0 &&
        !completedProjectIds.includes(payment.projectId)
      )
        return false;
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(payment.projectId)
      )
        return false;

      if (paymentModeFilter !== "all") {
        if (
          paymentModeFilter === "account" &&
          payment.paymentMode !== PaymentMode.account
        )
          return false;
        if (
          paymentModeFilter === "cash" &&
          payment.paymentMode !== PaymentMode.cash
        )
          return false;
      }

      if (referenceFilter) {
        if (
          !payment.reference
            .toLowerCase()
            .includes(referenceFilter.toLowerCase())
        )
          return false;
      }

      if (yearFilter !== "all") {
        const paymentYear = payment.date.split("-")[2];
        if (paymentYear !== yearFilter) return false;
      }

      if (financialYearFilter !== "all") {
        const [day, month, year] = payment.date.split("-").map(Number);
        const paymentDate = new Date(year, month - 1, day);
        const fyStart = Number.parseInt(financialYearFilter);
        const fyEnd = fyStart + 1;
        const fyStartDate = new Date(fyStart, 3, 1);
        const fyEndDate = new Date(fyEnd, 2, 31);
        if (paymentDate < fyStartDate || paymentDate > fyEndDate) return false;
      }

      if (startDateFilter) {
        const [startDay, startMonth, startYear] = startDateFilter
          .split("-")
          .map(Number);
        const [paymentDay, paymentMonth, paymentYear] = payment.date
          .split("-")
          .map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const paymentDate = new Date(paymentYear, paymentMonth - 1, paymentDay);
        if (paymentDate < startDate) return false;
      }

      if (endDateFilter) {
        const [endDay, endMonth, endYear] = endDateFilter
          .split("-")
          .map(Number);
        const [paymentDay, paymentMonth, paymentYear] = payment.date
          .split("-")
          .map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        const paymentDate = new Date(paymentYear, paymentMonth - 1, paymentDay);
        if (paymentDate > endDate) return false;
      }

      return true;
    });

    // Apply sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case "date": {
            const [aDay, aMonth, aYear] = a.date.split("-").map(Number);
            const [bDay, bMonth, bYear] = b.date.split("-").map(Number);
            aValue = new Date(aYear, aMonth - 1, aDay).getTime();
            bValue = new Date(bYear, bMonth - 1, bDay).getTime();
            break;
          }
          case "project":
            aValue = (
              projects.find((p) => p.id === a.projectId)?.name ?? ""
            ).toLowerCase();
            bValue = (
              projects.find((p) => p.id === b.projectId)?.name ?? ""
            ).toLowerCase();
            break;
          case "paymentAmount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "paymentMode":
            aValue = a.paymentMode === PaymentMode.account ? "account" : "cash";
            bValue = b.paymentMode === PaymentMode.account ? "account" : "cash";
            break;
          case "reference":
            aValue = a.reference.toLowerCase();
            bValue = b.reference.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by date DESC (latest first)
      filtered = [...filtered].sort((a, b) => {
        const [aDay, aMonth, aYear] = a.date.split("-").map(Number);
        const [bDay, bMonth, bYear] = b.date.split("-").map(Number);
        const aDate = new Date(aYear, aMonth - 1, aDay).getTime();
        const bDate = new Date(bYear, bMonth - 1, bDay).getTime();
        return bDate - aDate;
      });
    }

    return filtered;
  }, [
    payments,
    projects,
    completedProjectIds,
    selectedProjects,
    paymentModeFilter,
    referenceFilter,
    yearFilter,
    financialYearFilter,
    startDateFilter,
    endDateFilter,
    sortField,
    sortDirection,
  ]);

  const totalPaymentsAmount = useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [filteredPayments]);

  const formatFullDigitAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.projectId ||
      !formData.paymentAmount ||
      !formData.paymentDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const paymentData: Payment = {
      id: editingPayment?.id || `payment_${Date.now()}`,
      projectId: formData.projectId,
      amount: formData.paymentAmount,
      date: formData.paymentDate,
      paymentMode: formData.paymentMode,
      reference: formData.reference,
      remarks: formData.remarks || undefined,
    };

    if (editingPayment) {
      if (!canManage) {
        toast.error("Unauthorized: Only admins can update payments");
        return;
      }
      setShowEditPasswordDialog(true);
    } else {
      try {
        await addPayment.mutateAsync(paymentData);
        toast.success("Payment added successfully");
        setIsFormOpen(false);
        resetForm();
      } catch (error: any) {
        toast.error(error.message || "Operation failed");
      }
    }
  };

  const confirmEdit = async (password: string) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can update payments");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      const paymentData: Payment = {
        id: editingPayment!.id,
        projectId: formData.projectId,
        amount: formData.paymentAmount,
        date: formData.paymentDate,
        paymentMode: formData.paymentMode,
        reference: formData.reference,
        remarks: formData.remarks || undefined,
      };

      await updatePayment.mutateAsync({ payment: paymentData, password });
      toast.success("Payment updated successfully");
      setIsFormOpen(false);
      setShowEditPasswordDialog(false);
      resetForm();
    } catch (error: any) {
      if (error.message?.includes("Invalid password")) {
        toast.error("Invalid password. Update not allowed.");
      } else {
        toast.error(error.message || "Operation failed");
      }
    }
  };

  const handleEdit = (payment: Payment) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can edit payments");
      return;
    }
    setEditingPayment(payment);
    setFormData({
      paymentDate: payment.date,
      projectId: payment.projectId,
      paymentAmount: payment.amount,
      paymentMode: payment.paymentMode,
      reference: payment.reference,
      remarks: payment.remarks || "",
    });
    setIsFormOpen(true);
  };

  const handleView = (payment: Payment) => {
    setViewPayment(payment);
  };

  const handleDeleteClick = (paymentId: string) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can delete payments");
      return;
    }
    setDeleteConfirmPayment(paymentId);
  };

  const confirmDelete = async (password: string) => {
    if (!deleteConfirmPayment) return;

    if (!canManage) {
      toast.error("Unauthorized: Only admins can delete payments");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await deletePayment.mutateAsync({ id: deleteConfirmPayment, password });
      toast.success("Payment deleted successfully");
      setDeleteConfirmPayment(null);
    } catch (error: any) {
      if (error.message?.includes("Invalid password")) {
        toast.error("Invalid password. Delete not allowed.");
      } else {
        toast.error(error.message || "Delete failed");
      }
    }
  };

  const handleBulkDelete = async (password: string) => {
    if (selectedPayments.length === 0) {
      toast.error("No payments selected");
      return;
    }

    if (!canManage) {
      toast.error("Unauthorized: Only admins can bulk delete payments");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await bulkDeletePayments.mutateAsync({ password, ids: selectedPayments });
      toast.success(
        `${selectedPayments.length} payment(s) deleted successfully`,
      );
      setSelectedPayments([]);
      setShowBulkDeleteDialog(false);
    } catch (error: any) {
      if (error.message?.includes("Invalid password")) {
        toast.error("Invalid password. Bulk delete not allowed.");
      } else {
        toast.error(error.message || "Bulk delete failed");
      }
    }
  };

  const handlePrint = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payments to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Failed to open print window");
      return;
    }

    const currentDate = new Date()
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payments Report</title>
          <style>
            @page { margin: 20mm; }
            body { 
              font-family: 'Century Gothic', Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .header-label {
              font-weight: 700;
              color: #333;
            }
            .header-value {
              font-weight: 400;
              color: #555;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left;
              font-size: 11px;
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: 700;
              color: #333;
            }
            td {
              font-weight: 400;
              color: #333;
            }
            .text-right { text-align: right; }
            .negative { background-color: #FFF9C4; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-row">
              <span><span class="header-label">Print Date:</span> <span class="header-value">${currentDate}</span></span>
              <span><span class="header-label">Start Date:</span> <span class="header-value">${startDateFilter || "All"}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">End Date:</span> <span class="header-value">${endDateFilter || "All"}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">Total Payments Count:</span> <span class="header-value">${filteredPayments.length}</span></span>
              <span><span class="header-label">Total Amount:</span> <span class="header-value">${formatFullDigitAmount(totalPaymentsAmount)}</span></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Project Name</th>
                <th>Payment Mode</th>
                <th class="text-right">Amount</th>
                <th>Reference</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments
                .map(
                  (payment) => `
                <tr class="${payment.amount < 0 ? "negative" : ""}">
                  <td>${fmtDateDMY(payment.date)}</td>
                  <td>${getProjectName(payment.projectId)}</td>
                  <td>${payment.paymentMode === PaymentMode.account ? "Account" : "Cash"}</td>
                  <td class="text-right">${formatINR(payment.amount)}</td>
                  <td>${payment.reference}</td>
                  <td>${payment.remarks || "–"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleExportPDF = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payments to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Failed to open print window");
      return;
    }

    const currentDate = new Date()
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payments Report</title>
          <style>
            @page { margin: 20mm; }
            body { 
              font-family: 'Century Gothic', Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .header-label {
              font-weight: 700;
              color: #333;
            }
            .header-value {
              font-weight: 400;
              color: #555;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left;
              font-size: 11px;
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: 700;
              color: #333;
            }
            td {
              font-weight: 400;
              color: #333;
            }
            .text-right { text-align: right; }
            .negative { background-color: #FFF9C4; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-row">
              <span><span class="header-label">Print Date:</span> <span class="header-value">${currentDate}</span></span>
              <span><span class="header-label">Start Date:</span> <span class="header-value">${startDateFilter || "All"}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">End Date:</span> <span class="header-value">${endDateFilter || "All"}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">Total Payments Count:</span> <span class="header-value">${filteredPayments.length}</span></span>
              <span><span class="header-label">Total Amount:</span> <span class="header-value">${formatFullDigitAmount(totalPaymentsAmount)}</span></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Project Name</th>
                <th>Payment Mode</th>
                <th class="text-right">Amount</th>
                <th>Reference</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments
                .map(
                  (payment) => `
                <tr class="${payment.amount < 0 ? "negative" : ""}">
                  <td>${fmtDateDMY(payment.date)}</td>
                  <td>${getProjectName(payment.projectId)}</td>
                  <td>${payment.paymentMode === PaymentMode.account ? "Account" : "Cash"}</td>
                  <td class="text-right">${formatINR(payment.amount)}</td>
                  <td>${payment.reference}</td>
                  <td>${payment.remarks || "–"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    toast.success("PDF export window opened");
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payments to export");
      return;
    }
    const formattedData = formatPaymentsForExport(filteredPayments, projects);
    exportToCSV(formattedData, "payments");
    toast.success("CSV exported successfully");
  };

  const handleDownloadTemplate = () => {
    downloadPaymentsTemplate();
    toast.success("Payments template downloaded successfully");
  };

  const handleImportCSV = () => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can import payments");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        toast.error("No data found in CSV file");
        setIsImporting(false);
        return;
      }

      const { valid, invalid } = validatePaymentCSVData(parsedData, projects);

      if (invalid.length > 0) {
        console.warn("Invalid rows:", invalid);
        const errorMessages = invalid
          .map((inv) => `Row ${inv.row}: ${inv.error}`)
          .join("\n");
        console.error("Validation errors:\n", errorMessages);
      }

      if (valid.length === 0) {
        toast.error(
          "No valid payments found in CSV file. Please check the format and data.",
        );
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      for (const payment of valid) {
        try {
          await addPayment.mutateAsync(payment);
          successCount++;
        } catch (error) {
          console.error("Failed to import payment:", error);
        }
      }

      if (invalid.length > 0) {
        toast.success(
          `Successfully imported ${successCount} payments. ${invalid.length} rows skipped due to errors.`,
          {
            duration: 5000,
          },
        );
      } else {
        toast.success(`Successfully imported ${successCount} payments`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(
        error.message || "Failed to import CSV. Please check the file format.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedProjects([]);
    setPaymentModeFilter("all");
    setReferenceFilter("");
    setYearFilter("all");
    setFinancialYearFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  usePageShortcuts({
    newForm: () => {
      if (canManage) setIsFormOpen(true);
    },
    importCSV: () => {
      if (canManage) handleImportCSV();
    },
    exportCSV: handleExportCSV,
    exportPDF: handleExportPDF,
    downloadFormat: () => {
      if (canManage) handleDownloadTemplate();
    },
    clearFilters: handleClearFilters,
    resetFilters: handleClearFilters,
    refreshList: () =>
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
    focusSearch: () => {
      const input =
        document.querySelector<HTMLInputElement>("input[placeholder]");
      if (input) {
        input.focus();
        input.select();
      }
    },
    print: handlePrint,
    selectAll: () => {
      if (canManage) setSelectedPayments(filteredPayments.map((p) => p.id));
    },
    deleteSelected: () => {
      if (canManage && selectedPayments.length > 0)
        setShowBulkDeleteDialog(true);
    },
    bulkDelete: () => {
      if (canManage && selectedPayments.length > 0)
        setShowBulkDeleteDialog(true);
    },
  });

  const resetForm = () => {
    setFormData({
      paymentDate: "",
      projectId: "",
      paymentAmount: 0,
      paymentMode: PaymentMode.account,
      reference: "",
      remarks: "",
    });
    setEditingPayment(null);
  };

  const projectOptions = projects.map((p) => ({ id: p.id, label: p.name }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 13 },
    (_, i) => currentYear - 10 + i,
  );
  const financialYearOptions = Array.from(
    { length: 13 },
    (_, i) => currentYear - 10 + i,
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayments(filteredPayments.map((p) => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments([...selectedPayments, paymentId]);
    } else {
      setSelectedPayments(selectedPayments.filter((id) => id !== paymentId));
    }
  };

  const isPaymentSelected = (paymentId: string) => {
    return selectedPayments.includes(paymentId);
  };

  const allSelected =
    filteredPayments.length > 0 &&
    filteredPayments.every((payment) => isPaymentSelected(payment.id));

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {/* Top Ribbon Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side - Action Buttons */}
            <div className="flex items-center gap-2">
              <ActionButton
                icon={Printer}
                label="Print"
                onClick={handlePrint}
                variant="payments"
              />
              <ActionButton
                icon={FileDown}
                label="Export PDF"
                onClick={handleExportPDF}
                variant="payments"
              />
              {canManage && (
                <ActionButton
                  icon={FileUp}
                  label="Import CSV"
                  onClick={handleImportCSV}
                  disabled={isImporting}
                  variant="payments"
                />
              )}
              <ActionButton
                icon={FileDown}
                label="Export CSV"
                onClick={handleExportCSV}
                variant="payments"
              />
              <ActionButton
                icon={FileDown}
                label="Download Format"
                onClick={handleDownloadTemplate}
                variant="payments"
              />
              {canManage && selectedPayments.length > 0 && (
                <BulkDeleteButton
                  count={selectedPayments.length}
                  onClick={() => setShowBulkDeleteDialog(true)}
                />
              )}
              {canManage && (
                <ActionButton
                  icon={Plus}
                  label="New Payment"
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  variant="primary"
                />
              )}
            </div>

            {/* Right Side - Summary Card */}
            <div className="bg-gradient-to-r from-[#8B5CF6] to-[#10B981] text-white px-6 py-3 rounded-lg shadow-md min-w-[280px]">
              <div className="text-sm font-normal opacity-90">
                Total Payments
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatFullDigitAmount(totalPaymentsAmount)}
              </div>
              <div className="text-xs font-normal opacity-80 mt-1">
                {filteredPayments.length} Payments
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {/* Show Filters Toggle */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[#333333] hover:bg-gray-100 font-normal"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {/* Filters Panel - 3-row layout */}
        {showFilters && (
          <Card className="shadow-sm bg-[#E8F5E9] border-[#A5D6A7] rounded-lg animate-in">
            <CardContent className="p-4">
              {/* Row 1: Projects, Payment Mode, Reference */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Projects
                  </Label>
                  <div className="h-9">
                    <MultiSelectFilter
                      options={projectOptions}
                      selectedIds={selectedProjects}
                      onChange={setSelectedProjects}
                      placeholder="Select projects..."
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Payment Mode
                  </Label>
                  <Select
                    value={paymentModeFilter}
                    onValueChange={setPaymentModeFilter}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-md font-normal">
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Reference
                  </Label>
                  <Input
                    placeholder="Search by reference"
                    value={referenceFilter}
                    onChange={(e) => setReferenceFilter(e.target.value)}
                    className="h-9 text-sm rounded-md font-normal"
                  />
                </div>
              </div>

              {/* Row 2: Start Date, End Date, Year, Financial Year */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Start Date
                  </Label>
                  <DateInput
                    value={startDateFilter}
                    onChange={setStartDateFilter}
                    placeholder="dd-mm-yyyy"
                    className="h-9 text-sm rounded-md font-normal"
                  />
                </div>
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    End Date
                  </Label>
                  <DateInput
                    value={endDateFilter}
                    onChange={setEndDateFilter}
                    placeholder="dd-mm-yyyy"
                    className="h-9 text-sm rounded-md font-normal"
                  />
                </div>
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Year
                  </Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-9 text-sm rounded-md font-normal">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-normal mb-1 block text-[#333333]">
                    Financial Year
                  </Label>
                  <Select
                    value={financialYearFilter}
                    onValueChange={setFinancialYearFilter}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-md font-normal">
                      <SelectValue placeholder="All financial years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All financial years</SelectItem>
                      {financialYearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}-{year + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Record count (left) and Clear Filters button (right) */}
              <div className="flex items-center justify-between pt-2 border-t border-[#A5D6A7]">
                <p className="text-xs text-[#555555] font-normal">
                  Showing {filteredPayments.length} of {payments.length}{" "}
                  Payments
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 text-xs font-normal"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments List Table with Sortable Columns */}
        <Card className="shadow-sm rounded-lg bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white border-b border-gray-200">
                    {canManage && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          className="border-gray-400"
                        />
                      </TableHead>
                    )}
                    <TableHead
                      className="font-bold text-[#333333] w-28 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("date")}
                    >
                      Date{getSortIcon("date")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-40 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("project")}
                    >
                      Project{getSortIcon("project")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] text-right w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("paymentAmount")}
                    >
                      Payment Amount{getSortIcon("paymentAmount")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("paymentMode")}
                    >
                      Payment Mode{getSortIcon("paymentMode")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("reference")}
                    >
                      Reference{getSortIcon("reference")}
                    </TableHead>
                    <TableHead className="font-bold text-[#333333] w-40">
                      Remarks
                    </TableHead>
                    <TableHead className="font-bold text-[#333333] text-center w-24">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 8 : 7}
                        className="text-center py-8 text-[#555555] font-normal"
                      >
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment, index) => {
                      const isNegative = payment.amount < 0;
                      const rowClass = isNegative
                        ? "bg-[#FFF9C4] hover:bg-[#FFF59D]"
                        : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-[#E8F5E9] hover:bg-[#C8E6C9]";

                      return (
                        <TableRow key={payment.id} className={rowClass}>
                          {canManage && (
                            <TableCell>
                              <Checkbox
                                checked={isPaymentSelected(payment.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectPayment(
                                    payment.id,
                                    checked as boolean,
                                  )
                                }
                                className="border-gray-400"
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {fmtDateDMY(payment.date)}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={getProjectName(payment.projectId)}
                          >
                            {getProjectName(payment.projectId)}
                          </TableCell>
                          <TableCell
                            className={`font-normal text-right text-sm ${isNegative ? "text-[#FF0000]" : "text-[#333333]"}`}
                          >
                            {formatINR(payment.amount)}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {payment.paymentMode === PaymentMode.account
                              ? "Account"
                              : "Cash"}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={payment.reference}
                          >
                            {payment.reference}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={payment.remarks || "–"}
                          >
                            {payment.remarks || "–"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleView(payment)}
                                className="text-[#0078D7] hover:text-[#005A9E] transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(payment)}
                                    className="text-[#0078D7] hover:text-[#005A9E] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteClick(payment.id)
                                    }
                                    className="text-[#D32F2F] hover:text-[#B71C1C] transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* View Payment Modal - Styled per image 82 (Pic 3) */}
      <Dialog
        open={!!viewPayment}
        onOpenChange={(open) => {
          if (!open) setViewPayment(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DialogTitle className="font-bold text-xl text-[#333333]">
              Payment Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              {viewPayment && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      printPaymentReceipt({
                        Date: viewPayment.date,
                        Project: getProjectName(viewPayment.projectId),
                        "Payment Mode":
                          viewPayment.paymentMode === PaymentMode.account
                            ? "Account"
                            : "Cash",
                        "Total Amount": formatINR(viewPayment.amount),
                        Reference: viewPayment.reference,
                        Remarks: viewPayment.remarks || "–",
                      })
                    }
                    className="text-[#28A745] hover:text-[#1e7e34] transition-colors"
                    title="Print Receipt"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Payment No: ${viewPayment!.reference || ""}\nProject: ${getProjectName(viewPayment!.projectId)}\nDate: ${fmtDateDMY(viewPayment!.date)}\nAmount: ${formatINR(viewPayment!.amount)}`;
                      if (navigator.share)
                        navigator.share({ title: "Payment Receipt", text });
                      else {
                        navigator.clipboard.writeText(text);
                      }
                    }}
                    className="text-[#555555] hover:text-[#333333] transition-colors"
                    title="Share Receipt"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewPayment(null)}
                className="text-[#555555] hover:text-[#333333] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          {viewPayment && (
            <div
              className="space-y-3 py-4"
              style={{
                border: "3px solid #28A745",
                borderRadius: "8px",
                padding: "16px",
                background: "#E8F5E9",
                margin: "8px 0",
              }}
            >
              <div className="grid grid-cols-2 gap-4 bg-[#E3F2FD] p-3 rounded-md">
                <div>
                  <span className="font-bold text-[#333333]">Date:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {fmtDateDMY(viewPayment.date)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">Project:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {getProjectName(viewPayment.projectId)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-md border border-gray-200">
                <div>
                  <span className="font-bold text-[#333333]">
                    Payment Mode:
                  </span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {viewPayment.paymentMode === PaymentMode.account
                      ? "Account"
                      : "Cash"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">
                    Total Amount:
                  </span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {formatINR(viewPayment.amount)}
                  </span>
                </div>
              </div>

              <div className="bg-[#E3F2FD] p-3 rounded-md">
                <div className="font-bold text-[#333333] mb-1">Reference:</div>
                <div className="font-normal text-[#555555]">
                  {viewPayment.reference}
                </div>
              </div>

              <div className="bg-white p-3 rounded-md border border-gray-200">
                <div className="font-bold text-[#333333] mb-1">Remarks:</div>
                <div className="font-normal text-[#555555]">
                  {viewPayment.remarks || "–"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl">
              {editingPayment ? "Edit Payment" : "New Payment"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="font-bold">Project *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-bold">Date *</Label>
                <DateInput
                  value={formData.paymentDate}
                  onChange={(value) =>
                    setFormData({ ...formData, paymentDate: value })
                  }
                  placeholder="dd-mm-yyyy"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="font-bold">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.paymentAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentAmount: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="font-bold">Payment Mode *</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={
                      formData.paymentMode === PaymentMode.account
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setFormData({
                        ...formData,
                        paymentMode: PaymentMode.account,
                      })
                    }
                    className={
                      formData.paymentMode === PaymentMode.account
                        ? "bg-[#28A745] hover:bg-[#218838]"
                        : ""
                    }
                  >
                    Account
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.paymentMode === PaymentMode.cash
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setFormData({
                        ...formData,
                        paymentMode: PaymentMode.cash,
                      })
                    }
                    className={
                      formData.paymentMode === PaymentMode.cash
                        ? "bg-[#555555] hover:bg-[#333333]"
                        : ""
                    }
                  >
                    Cash
                  </Button>
                </div>
              </div>

              <div>
                <Label className="font-normal">Reference</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="Enter reference"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="font-normal">Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Enter remarks (optional)"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#28A745] hover:bg-[#218838]">
                {editingPayment ? "Update Payment" : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      canManage && (
      <PasswordConfirmModal
        open={showEditPasswordDialog}
        onOpenChange={setShowEditPasswordDialog}
        onConfirm={confirmEdit}
        title="Confirm Edit"
        description="Please enter your password to confirm payment update."
        confirmText="Confirm Update"
        isPending={updatePayment.isPending}
      />
      )canManage && (
      <PasswordConfirmModal
        open={!!deleteConfirmPayment}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmPayment(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete Payment"
        isPending={deletePayment.isPending}
      />
      )canManage && (
      <PasswordConfirmModal
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Delete"
        description={`Are you sure you want to delete ${selectedPayments.length} selected payment(s)? This action cannot be undone.`}
        confirmText="Delete Payments"
        isPending={bulkDeletePayments.isPending}
      />
      )
    </div>
  );
}
