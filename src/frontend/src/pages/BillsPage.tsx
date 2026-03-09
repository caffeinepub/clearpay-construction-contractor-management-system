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
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Bill, type BillKey, UserRole } from "../backend";
import { ActionButton } from "../components/ActionButton";
import { BulkDeleteButton } from "../components/BulkDeleteButton";
import { DateInput } from "../components/DateInput";
import { MultiSelectFilter } from "../components/MultiSelectFilter";
import { PasswordConfirmModal } from "../components/PasswordConfirmModal";
import {
  useAddBill,
  useBulkDeleteBills,
  useDeleteBill,
  useGetAllBills,
  useGetAllProjects,
  useGetCallerUserProfile,
  useUpdateBill,
} from "../hooks/useQueries";
import {
  downloadBillsTemplate,
  exportBillsToPDF,
  exportToCSV,
  formatBillsForExport,
  parseCSV,
  validateBillCSVData,
} from "../lib/exportUtils";

type SortField =
  | "date"
  | "project"
  | "client"
  | "blockId"
  | "billNumber"
  | "description"
  | "quantity"
  | "unit"
  | "unitPrice"
  | "totalAmount";
type SortDirection = "asc" | "desc" | null;

export default function BillsPage() {
  const _navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [blockIdFilter, setBlockIdFilter] = useState("");
  const [billNumberFilter, setBillNumberFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBills, setSelectedBills] = useState<BillKey[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<BillKey | null>(
    null,
  );
  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    date: "",
    projectId: "",
    blockId: "",
    billNumber: "",
    description: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    remarks: "",
  });

  const { data: bills = [] } = useGetAllBills();
  const { data: projects = [] } = useGetAllProjects();
  const { data: currentUser } = useGetCallerUserProfile();
  const addBill = useAddBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const bulkDeleteBills = useBulkDeleteBills();

  // CRITICAL: Check if user can manage data (Master Admin or Admin role)
  const canManage = canManageData(currentUser?.email, currentUser?.role);

  // Get unique clients from projects
  const clientOptions = useMemo(() => {
    const uniqueClients = new Set<string>();
    for (const p of projects) {
      if (p.client) uniqueClients.add(p.client);
    }
    return Array.from(uniqueClients)
      .sort()
      .map((client) => ({ id: client, label: client }));
  }, [projects]);

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

  const filteredBills = useMemo(() => {
    let filtered = bills.filter((bill) => {
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(bill.projectId)
      )
        return false;

      if (selectedClients.length > 0) {
        const project = projects.find((p) => p.id === bill.projectId);
        if (!project || !selectedClients.includes(project.client)) return false;
      }

      if (blockIdFilter) {
        const billBlockId = bill.blockId || "";
        if (!billBlockId.toLowerCase().includes(blockIdFilter.toLowerCase()))
          return false;
      }

      if (billNumberFilter) {
        const billNum = bill.billNumber || "";
        if (billNum !== billNumberFilter) return false;
      }

      if (yearFilter !== "all") {
        const billYear = bill.date.split("-")[2];
        if (billYear !== yearFilter) return false;
      }

      if (financialYearFilter !== "all") {
        const [day, month, year] = bill.date.split("-").map(Number);
        const billDate = new Date(year, month - 1, day);
        const fyStart = Number.parseInt(financialYearFilter);
        const fyEnd = fyStart + 1;
        const fyStartDate = new Date(fyStart, 3, 1);
        const fyEndDate = new Date(fyEnd, 2, 31);
        if (billDate < fyStartDate || billDate > fyEndDate) return false;
      }

      if (startDateFilter) {
        const [startDay, startMonth, startYear] = startDateFilter
          .split("-")
          .map(Number);
        const [billDay, billMonth, billYear] = bill.date.split("-").map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const billDate = new Date(billYear, billMonth - 1, billDay);
        if (billDate < startDate) return false;
      }

      if (endDateFilter) {
        const [endDay, endMonth, endYear] = endDateFilter
          .split("-")
          .map(Number);
        const [billDay, billMonth, billYear] = bill.date.split("-").map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        const billDate = new Date(billYear, billMonth - 1, billDay);
        if (billDate > endDate) return false;
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
            aValue = getProjectName(a.projectId).toLowerCase();
            bValue = getProjectName(b.projectId).toLowerCase();
            break;
          case "client":
            aValue = getClientName(a.projectId).toLowerCase();
            bValue = getClientName(b.projectId).toLowerCase();
            break;
          case "blockId":
            aValue = (a.blockId || "").toLowerCase();
            bValue = (b.blockId || "").toLowerCase();
            break;
          case "billNumber":
            aValue = a.billNumber.toLowerCase();
            bValue = b.billNumber.toLowerCase();
            break;
          case "description":
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
            break;
          case "quantity":
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case "unit":
            aValue = a.unit.toLowerCase();
            bValue = b.unit.toLowerCase();
            break;
          case "unitPrice":
            aValue = a.unitPrice;
            bValue = b.unitPrice;
            break;
          case "totalAmount":
            aValue = a.amount;
            bValue = b.amount;
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
    bills,
    selectedProjects,
    selectedClients,
    blockIdFilter,
    billNumberFilter,
    yearFilter,
    financialYearFilter,
    startDateFilter,
    endDateFilter,
    projects,
    sortField,
    sortDirection,
  ]);

  const totalBillsAmount = useMemo(() => {
    return filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  }, [filteredBills]);

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

    if (!canManage && editingBill) {
      toast.error("Unauthorized: Only admins can modify bills");
      return;
    }

    if (
      !formData.projectId ||
      !formData.date ||
      !formData.billNumber ||
      !formData.quantity ||
      !formData.unitPrice ||
      !formData.unit ||
      !formData.description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const quantity = Number.parseFloat(formData.quantity);
    const unitPrice = Number.parseFloat(formData.unitPrice);

    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
      toast.error("Quantity and Unit Price must be valid numbers");
      return;
    }

    const amount = quantity * unitPrice;

    const billData: Bill = {
      projectId: formData.projectId,
      blockId: formData.blockId.trim() || undefined,
      billNumber: formData.billNumber.trim(),
      description: formData.description.trim(),
      quantity: quantity,
      unit: formData.unit,
      unitPrice: unitPrice,
      remarks: formData.remarks.trim() || undefined,
      date: formData.date,
      amount: amount,
      includesGst: false,
    };

    if (editingBill) {
      if (!canManage) {
        toast.error("Unauthorized: Only admins can update bills");
        return;
      }
      setShowEditPasswordDialog(true);
    } else {
      try {
        await addBill.mutateAsync(billData);
        toast.success("Bill added successfully");
        setIsFormOpen(false);
        resetForm();
      } catch (error: any) {
        const errorMessage = error.message || "Operation failed";
        if (
          errorMessage.includes(
            "This bill number already entered in this project",
          )
        ) {
          toast.error("This bill number already entered in this project.");
        } else {
          toast.error(errorMessage);
        }
      }
    }
  };

  const confirmEdit = async (password: string) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can update bills");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      const quantity = Number.parseFloat(formData.quantity);
      const unitPrice = Number.parseFloat(formData.unitPrice);
      const amount = quantity * unitPrice;

      const billData: Bill = {
        projectId: formData.projectId,
        blockId: formData.blockId.trim() || undefined,
        billNumber: formData.billNumber.trim(),
        description: formData.description.trim(),
        quantity: quantity,
        unit: formData.unit,
        unitPrice: unitPrice,
        remarks: formData.remarks.trim() || undefined,
        date: formData.date,
        amount: amount,
        includesGst: false,
      };

      await updateBill.mutateAsync({ bill: billData, password });
      toast.success("Bill updated successfully");
      setIsFormOpen(false);
      setShowEditPasswordDialog(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.message || "Operation failed";
      if (errorMessage.includes("Invalid password")) {
        toast.error("Invalid password. Update not allowed.");
      } else if (
        errorMessage.includes(
          "This bill number already entered in this project",
        )
      ) {
        toast.error("This bill number already entered in this project.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (bill: Bill) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can edit bills");
      return;
    }
    setEditingBill(bill);
    setFormData({
      date: bill.date,
      projectId: bill.projectId,
      blockId: bill.blockId || "",
      billNumber: bill.billNumber,
      description: bill.description,
      quantity: bill.quantity.toString(),
      unit: bill.unit,
      unitPrice: bill.unitPrice.toString(),
      remarks: bill.remarks || "",
    });
    setIsFormOpen(true);
  };

  const handleView = (bill: Bill) => {
    setViewBill(bill);
  };

  const handleDeleteClick = (billKey: BillKey) => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can delete bills");
      return;
    }
    setDeleteConfirmBill(billKey);
  };

  const confirmDelete = async (password: string) => {
    if (!deleteConfirmBill) return;

    if (!canManage) {
      toast.error("Unauthorized: Only admins can delete bills");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await deleteBill.mutateAsync({
        projectId: deleteConfirmBill.projectId,
        billNumber: deleteConfirmBill.billNumber,
        password,
      });
      toast.success("Bill deleted successfully");
      setDeleteConfirmBill(null);
    } catch (error: any) {
      if (error.message?.includes("Invalid password")) {
        toast.error("Invalid password. Delete not allowed.");
      } else {
        toast.error(error.message || "Delete failed");
      }
    }
  };

  const handleBulkDelete = async (password: string) => {
    if (selectedBills.length === 0) {
      toast.error("No bills selected");
      return;
    }

    if (!canManage) {
      toast.error("Unauthorized: Only admins can bulk delete bills");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await bulkDeleteBills.mutateAsync({ password, billKeys: selectedBills });
      toast.success(`${selectedBills.length} bill(s) deleted successfully`);
      setSelectedBills([]);
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
    if (filteredBills.length === 0) {
      toast.error("No bills to print");
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
          <title>Bills Report</title>
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
              <span><span class="header-label">No of Bills:</span> <span class="header-value">${filteredBills.length}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">Total Bills Amount:</span> <span class="header-value">${formatFullDigitAmount(totalBillsAmount)}</span></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Block ID</th>
                <th>Bill No</th>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th>Unit</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills
                .map(
                  (bill) => `
                <tr class="${bill.amount < 0 ? "negative" : ""}">
                  <td>${bill.date}</td>
                  <td>${getProjectName(bill.projectId)}</td>
                  <td>${bill.blockId || "–"}</td>
                  <td>${bill.billNumber}</td>
                  <td>${bill.description}</td>
                  <td class="text-right">${formatNumber(bill.quantity)}</td>
                  <td>${bill.unit}</td>
                  <td class="text-right">${formatINR(bill.unitPrice)}</td>
                  <td class="text-right">${formatINR(bill.amount)}</td>
                  <td>${bill.remarks || "–"}</td>
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
    if (filteredBills.length === 0) {
      toast.error("No bills to export");
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
          <title>Bills Report</title>
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
              <span><span class="header-label">No of Bills:</span> <span class="header-value">${filteredBills.length}</span></span>
            </div>
            <div class="header-row">
              <span><span class="header-label">Total Bills Amount:</span> <span class="header-value">${formatFullDigitAmount(totalBillsAmount)}</span></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Block ID</th>
                <th>Bill No</th>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th>Unit</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills
                .map(
                  (bill) => `
                <tr class="${bill.amount < 0 ? "negative" : ""}">
                  <td>${bill.date}</td>
                  <td>${getProjectName(bill.projectId)}</td>
                  <td>${bill.blockId || "–"}</td>
                  <td>${bill.billNumber}</td>
                  <td>${bill.description}</td>
                  <td class="text-right">${formatNumber(bill.quantity)}</td>
                  <td>${bill.unit}</td>
                  <td class="text-right">${formatINR(bill.unitPrice)}</td>
                  <td class="text-right">${formatINR(bill.amount)}</td>
                  <td>${bill.remarks || "–"}</td>
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
    if (filteredBills.length === 0) {
      toast.error("No bills to export");
      return;
    }
    const formattedData = formatBillsForExport(filteredBills, projects);
    exportToCSV(formattedData, "bills");
    toast.success("CSV exported successfully");
  };

  const handleDownloadTemplate = () => {
    downloadBillsTemplate();
    toast.success("Bills template downloaded successfully");
  };

  const handleImportCSV = () => {
    if (!canManage) {
      toast.error("Unauthorized: Only admins can import bills");
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

      const { valid, invalid } = validateBillCSVData(
        parsedData,
        projects,
        bills,
      );

      if (invalid.length > 0) {
        console.warn("Invalid rows:", invalid);
        const errorMessages = invalid
          .map((inv) => `Row ${inv.row}: ${inv.error}`)
          .join("\n");
        console.error("Validation errors:\n", errorMessages);
      }

      if (valid.length === 0) {
        toast.error(
          "No valid bills found in CSV file. Please check the format and data.",
        );
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      for (const bill of valid) {
        try {
          await addBill.mutateAsync(bill);
          successCount++;
        } catch (error) {
          console.error("Failed to import bill:", error);
        }
      }

      if (invalid.length > 0) {
        toast.success(
          `Successfully imported ${successCount} bills. ${invalid.length} rows skipped due to duplicate Project + Bill No or validation errors.`,
          {
            duration: 5000,
          },
        );
      } else {
        toast.success(`Successfully imported ${successCount} bills`);
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
    setSelectedClients([]);
    setBlockIdFilter("");
    setBillNumberFilter("");
    setYearFilter("all");
    setFinancialYearFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const resetForm = () => {
    setFormData({
      date: "",
      projectId: "",
      blockId: "",
      billNumber: "",
      description: "",
      quantity: "",
      unit: "",
      unitPrice: "",
      remarks: "",
    });
    setEditingBill(null);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || "Unknown";
  };

  const getClientName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.client || "Unknown";
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
      setSelectedBills(
        filteredBills.map((b) => ({
          projectId: b.projectId,
          billNumber: b.billNumber,
        })),
      );
    } else {
      setSelectedBills([]);
    }
  };

  const handleSelectBill = (billKey: BillKey, checked: boolean) => {
    if (checked) {
      setSelectedBills([...selectedBills, billKey]);
    } else {
      setSelectedBills(
        selectedBills.filter(
          (b) =>
            !(
              b.projectId === billKey.projectId &&
              b.billNumber === billKey.billNumber
            ),
        ),
      );
    }
  };

  const isBillSelected = (billKey: BillKey) => {
    return selectedBills.some(
      (b) =>
        b.projectId === billKey.projectId &&
        b.billNumber === billKey.billNumber,
    );
  };

  const allSelected =
    filteredBills.length > 0 &&
    filteredBills.every((bill) =>
      isBillSelected({
        projectId: bill.projectId,
        billNumber: bill.billNumber,
      }),
    );

  const totalAmountCalculated = useMemo(() => {
    if (!formData.quantity || !formData.unitPrice) return 0;
    const qty = Number.parseFloat(formData.quantity);
    const price = Number.parseFloat(formData.unitPrice);
    if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
    return qty * price;
  }, [formData.quantity, formData.unitPrice]);

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
                variant="bills"
              />
              <ActionButton
                icon={FileDown}
                label="Export PDF"
                onClick={handleExportPDF}
                variant="bills"
              />
              {canManage && (
                <ActionButton
                  icon={FileUp}
                  label="Import CSV"
                  onClick={handleImportCSV}
                  disabled={isImporting}
                  variant="bills"
                />
              )}
              <ActionButton
                icon={FileDown}
                label="Export CSV"
                onClick={handleExportCSV}
                variant="bills"
              />
              <ActionButton
                icon={FileDown}
                label="Download Format"
                onClick={handleDownloadTemplate}
                variant="bills"
              />
              {canManage && selectedBills.length > 0 && (
                <BulkDeleteButton
                  count={selectedBills.length}
                  onClick={() => setShowBulkDeleteDialog(true)}
                />
              )}
              {canManage && (
                <ActionButton
                  icon={Plus}
                  label="New Bill"
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  variant="primary"
                />
              )}
            </div>

            {/* Right Side - Summary Card */}
            <div className="bg-gradient-to-r from-[#D32F2F] to-[#FFA500] text-white px-6 py-3 rounded-lg shadow-md min-w-[280px]">
              <div className="text-sm font-normal opacity-90">
                Total Bills Amount
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatFullDigitAmount(totalBillsAmount)}
              </div>
              <div className="text-xs font-normal opacity-80 mt-1">
                {filteredBills.length} Bills
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

        {/* Filters Panel - Updated layout matching image 88 with increased height */}
        {showFilters && (
          <Card
            className="shadow-sm bg-[#FFF8E1] border-[#E8E6D0] rounded-lg animate-in"
            style={{ minHeight: "189px" }}
          >
            <CardContent className="p-5">
              {/* Row 1: Projects, Client, Block ID, Bill No */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Projects
                  </Label>
                  <div className="h-10">
                    <MultiSelectFilter
                      options={projectOptions}
                      selectedIds={selectedProjects}
                      onChange={setSelectedProjects}
                      placeholder="Select projects..."
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Client
                  </Label>
                  <div className="h-10">
                    <MultiSelectFilter
                      options={clientOptions}
                      selectedIds={selectedClients}
                      onChange={setSelectedClients}
                      placeholder="Select clients..."
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Block ID
                  </Label>
                  <Input
                    placeholder="Search by block ID"
                    value={blockIdFilter}
                    onChange={(e) => setBlockIdFilter(e.target.value)}
                    className="h-10 text-sm rounded-md font-normal"
                  />
                </div>
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Bill No
                  </Label>
                  <Input
                    placeholder="Exact bill number"
                    value={billNumberFilter}
                    onChange={(e) => setBillNumberFilter(e.target.value)}
                    className="h-10 text-sm rounded-md font-normal"
                  />
                </div>
              </div>

              {/* Row 2: Year, Financial Year, Start Date, End Date */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Year
                  </Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-10 text-sm rounded-md font-normal">
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
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Financial Year
                  </Label>
                  <Select
                    value={financialYearFilter}
                    onValueChange={setFinancialYearFilter}
                  >
                    <SelectTrigger className="h-10 text-sm rounded-md font-normal">
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
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    Start Date
                  </Label>
                  <DateInput
                    value={startDateFilter}
                    onChange={setStartDateFilter}
                    placeholder="dd-mm-yyyy"
                    className="h-10 text-sm rounded-md font-normal"
                  />
                </div>
                <div>
                  <Label className="text-sm font-normal mb-1.5 block text-[#333333]">
                    End Date
                  </Label>
                  <DateInput
                    value={endDateFilter}
                    onChange={setEndDateFilter}
                    placeholder="dd-mm-yyyy"
                    className="h-10 text-sm rounded-md font-normal"
                  />
                </div>
              </div>

              {/* Row 3: Record count (left) and Clear Filters button (right) */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8E6D0]">
                <p className="text-sm text-[#555555] font-normal">
                  Showing {filteredBills.length} of {bills.length} bills
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-sm font-normal px-4"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bills List Table with Sortable Columns */}
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
                      className="font-bold text-[#333333] w-24 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("date")}
                    >
                      Date{getSortIcon("date")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("project")}
                    >
                      Project{getSortIcon("project")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("client")}
                    >
                      Client{getSortIcon("client")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-24 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("blockId")}
                    >
                      Block ID{getSortIcon("blockId")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-24 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("billNumber")}
                    >
                      Bill No{getSortIcon("billNumber")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-40 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("description")}
                    >
                      Description{getSortIcon("description")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] text-right w-24 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("quantity")}
                    >
                      Qty{getSortIcon("quantity")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] w-20 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("unit")}
                    >
                      Unit{getSortIcon("unit")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] text-right w-28 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("unitPrice")}
                    >
                      Unit Price{getSortIcon("unitPrice")}
                    </TableHead>
                    <TableHead
                      className="font-bold text-[#333333] text-right w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("totalAmount")}
                    >
                      Total Amount{getSortIcon("totalAmount")}
                    </TableHead>
                    <TableHead className="font-bold text-[#333333] text-center w-24">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 12 : 11}
                        className="text-center py-8 text-[#555555] font-normal"
                      >
                        No bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill, index) => {
                      const billKey = {
                        projectId: bill.projectId,
                        billNumber: bill.billNumber,
                      };
                      const isNegative = bill.amount < 0;
                      const rowClass = isNegative
                        ? "bg-[#FFF9C4] hover:bg-[#FFF59D]"
                        : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-[#FFEBEE] hover:bg-[#FFCDD2]";

                      return (
                        <TableRow
                          key={`${bill.projectId}-${bill.billNumber}`}
                          className={rowClass}
                        >
                          {canManage && (
                            <TableCell>
                              <Checkbox
                                checked={isBillSelected(billKey)}
                                onCheckedChange={(checked) =>
                                  handleSelectBill(billKey, checked as boolean)
                                }
                                className="border-gray-400"
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {bill.date}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={getProjectName(bill.projectId)}
                          >
                            {getProjectName(bill.projectId)}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={getClientName(bill.projectId)}
                          >
                            {getClientName(bill.projectId)}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {bill.blockId || "–"}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {bill.billNumber}
                          </TableCell>
                          <TableCell
                            className="font-normal text-[#333333] text-sm truncate"
                            title={bill.description}
                          >
                            {bill.description}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-right text-sm">
                            {formatNumber(bill.quantity)}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-sm">
                            {bill.unit}
                          </TableCell>
                          <TableCell className="font-normal text-[#333333] text-right text-sm">
                            {formatINR(bill.unitPrice)}
                          </TableCell>
                          <TableCell
                            className={`font-normal text-right text-sm ${isNegative ? "text-[#FF0000]" : "text-[#333333]"}`}
                          >
                            {formatINR(bill.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleView(bill)}
                                className="text-[#0078D7] hover:text-[#005A9E] transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(bill)}
                                    className="text-[#0078D7] hover:text-[#005A9E] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(billKey)}
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

      {/* View Bill Modal - Styled as image 78 */}
      <Dialog
        open={!!viewBill}
        onOpenChange={(open) => {
          if (!open) setViewBill(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DialogTitle className="font-bold text-xl text-[#333333]">
              Bill Details
            </DialogTitle>
            <button
              type="button"
              onClick={() => setViewBill(null)}
              className="text-[#555555] hover:text-[#333333] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          {viewBill && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-4 bg-[#E3F2FD] p-3 rounded-md">
                <div>
                  <span className="font-bold text-[#333333]">Date:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {viewBill.date}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">Project:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {getProjectName(viewBill.projectId)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-md border border-gray-200">
                <div>
                  <span className="font-bold text-[#333333]">Bill No:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {viewBill.billNumber}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">Block ID:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {viewBill.blockId || "–"}
                  </span>
                </div>
              </div>

              <div className="bg-[#E3F2FD] p-3 rounded-md">
                <div className="font-bold text-[#333333] mb-1">
                  Description of item:
                </div>
                <div className="font-normal text-[#555555]">
                  {viewBill.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-md border border-gray-200">
                <div>
                  <span className="font-bold text-[#333333]">Qty:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {formatNumber(viewBill.quantity)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">Unit:</span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {viewBill.unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#E3F2FD] p-3 rounded-md">
                <div>
                  <span className="font-bold text-[#333333]">
                    Unit Price (₹):
                  </span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {formatINR(viewBill.unitPrice)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#333333]">
                    Total Amount:
                  </span>
                  <span className="ml-2 font-normal text-[#555555]">
                    {formatINR(viewBill.amount)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-md border border-gray-200">
                <div className="font-bold text-[#333333] mb-1">Remarks:</div>
                <div className="font-normal text-[#555555]">
                  {viewBill.remarks || "–"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Form Dialog */}
      {canManage && (
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
                {editingBill ? "Edit Bill" : "New Bill"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="font-bold">Date *</Label>
                  <DateInput
                    value={formData.date}
                    onChange={(value) =>
                      setFormData({ ...formData, date: value })
                    }
                    placeholder="dd-mm-yyyy"
                    className="mt-1"
                  />
                </div>

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
                  <Label className="font-normal">Block ID</Label>
                  <Input
                    value={formData.blockId}
                    onChange={(e) =>
                      setFormData({ ...formData, blockId: e.target.value })
                    }
                    placeholder="Enter block ID (optional)"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="font-bold">Bill No *</Label>
                  <Input
                    value={formData.billNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, billNumber: e.target.value })
                    }
                    placeholder="Enter bill number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="font-bold">Description of Item *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter description"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) =>
                        setFormData({ ...formData, unit: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rft">Rft</SelectItem>
                        <SelectItem value="Sft">Sft</SelectItem>
                        <SelectItem value="Cuft">Cuft</SelectItem>
                        <SelectItem value="Rmt">Rmt</SelectItem>
                        <SelectItem value="Smt">Smt</SelectItem>
                        <SelectItem value="Cumt">Cumt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="font-bold">Unit Price (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, unitPrice: e.target.value })
                    }
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="font-bold">Total Amount</Label>
                  <Input
                    value={formatINR(totalAmountCalculated)}
                    disabled
                    className="mt-1 bg-gray-100"
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
                <Button
                  type="submit"
                  className="bg-[#28A745] hover:bg-[#218838]"
                >
                  {editingBill ? "Update Bill" : "Save Bill"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Password Modal */}
      {canManage && (
        <PasswordConfirmModal
          open={showEditPasswordDialog}
          onOpenChange={setShowEditPasswordDialog}
          onConfirm={confirmEdit}
          title="Confirm Edit"
          description="Please enter your password to confirm bill update."
          confirmText="Confirm Update"
          isPending={updateBill.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {canManage && (
        <PasswordConfirmModal
          open={!!deleteConfirmBill}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmBill(null);
          }}
          onConfirm={confirmDelete}
          title="Confirm Delete"
          description="Are you sure you want to delete this bill? This action cannot be undone."
          confirmText="Delete Bill"
          isPending={deleteBill.isPending}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {canManage && (
        <PasswordConfirmModal
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
          onConfirm={handleBulkDelete}
          title="Confirm Bulk Delete"
          description={`Are you sure you want to delete ${selectedBills.length} selected bill(s)? This action cannot be undone.`}
          confirmText="Delete Bills"
          isPending={bulkDeleteBills.isPending}
        />
      )}
    </div>
  );
}
