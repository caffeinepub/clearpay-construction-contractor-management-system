import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Settings2,
  ZoomIn,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { PaymentMode } from "../backend";
import ChartZoomModal from "../components/ChartZoomModal";
import { DateInput } from "../components/DateInput";
import {
  useGetAllBills,
  useGetAllClients,
  useGetAllPayments,
  useGetAllProjects,
} from "../hooks/useQueries";

export default function DashboardPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedFinancialYear, setSelectedFinancialYear] =
    useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [zoomedChart, setZoomedChart] = useState<string | null>(null);

  const { data: bills = [] } = useGetAllBills();
  const { data: payments = [] } = useGetAllPayments();
  const { data: projects = [] } = useGetAllProjects();
  const { data: _clients = [] } = useGetAllClients();

  // Validate date range
  const isDateRangeValid = useMemo(() => {
    if (!startDate || !endDate) return true;

    const [startDay, startMonth, startYear] = startDate.split("-").map(Number);
    const [endDay, endMonth, endYear] = endDate.split("-").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    return start <= end;
  }, [startDate, endDate]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Project filter
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(b.projectId)
      )
        return false;

      // Client filter
      if (selectedClient !== "all") {
        const project = projects.find((p) => p.id === b.projectId);
        if (project?.client !== selectedClient) return false;
      }

      // Parse bill date
      const [billDay, billMonth, billYear] = b.date.split("-").map(Number);
      const billDate = new Date(billYear, billMonth - 1, billDay);

      // Year filter
      if (selectedYear !== "all") {
        if (billYear.toString() !== selectedYear) return false;
      }

      // Financial Year filter (April to March)
      if (selectedFinancialYear !== "all") {
        const fyStart = Number.parseInt(selectedFinancialYear);
        const fyEnd = fyStart + 1;
        const fyStartDate = new Date(fyStart, 3, 1); // April 1st
        const fyEndDate = new Date(fyEnd, 2, 31); // March 31st
        if (billDate < fyStartDate || billDate > fyEndDate) return false;
      }

      // Date range filter (inclusive)
      if (startDate) {
        const [startDay, startMonth, startYear] = startDate
          .split("-")
          .map(Number);
        const start = new Date(startYear, startMonth - 1, startDay);
        if (billDate < start) return false;
      }

      if (endDate) {
        const [endDay, endMonth, endYear] = endDate.split("-").map(Number);
        const end = new Date(endYear, endMonth - 1, endDay);
        if (billDate > end) return false;
      }

      return true;
    });
  }, [
    bills,
    selectedProjects,
    selectedClient,
    selectedYear,
    selectedFinancialYear,
    startDate,
    endDate,
    projects,
  ]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Project filter
      if (
        selectedProjects.length > 0 &&
        !selectedProjects.includes(p.projectId)
      )
        return false;

      // Client filter
      if (selectedClient !== "all") {
        const project = projects.find((pr) => pr.id === p.projectId);
        if (project?.client !== selectedClient) return false;
      }

      // Parse payment date
      const [payDay, payMonth, payYear] = p.date.split("-").map(Number);
      const payDate = new Date(payYear, payMonth - 1, payDay);

      // Year filter
      if (selectedYear !== "all") {
        if (payYear.toString() !== selectedYear) return false;
      }

      // Financial Year filter (April to March)
      if (selectedFinancialYear !== "all") {
        const fyStart = Number.parseInt(selectedFinancialYear);
        const fyEnd = fyStart + 1;
        const fyStartDate = new Date(fyStart, 3, 1); // April 1st
        const fyEndDate = new Date(fyEnd, 2, 31); // March 31st
        if (payDate < fyStartDate || payDate > fyEndDate) return false;
      }

      // Date range filter (inclusive)
      if (startDate) {
        const [startDay, startMonth, startYear] = startDate
          .split("-")
          .map(Number);
        const start = new Date(startYear, startMonth - 1, startDay);
        if (payDate < start) return false;
      }

      if (endDate) {
        const [endDay, endMonth, endYear] = endDate.split("-").map(Number);
        const end = new Date(endYear, endMonth - 1, endDay);
        if (payDate > end) return false;
      }

      return true;
    });
  }, [
    payments,
    selectedProjects,
    selectedClient,
    selectedYear,
    selectedFinancialYear,
    startDate,
    endDate,
    projects,
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLakhCroreCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    }
    if (absValue >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    }
    return formatCompactCurrency(value);
  };

  const totalBills = filteredBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalBills - totalPayments);
  const billsCount = filteredBills.length;
  const paymentsCount = filteredPayments.length;

  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { bills: number; payments: number }>();

    for (const bill of filteredBills) {
      const [day, month, year] = bill.date.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
      const existing = monthMap.get(key) || { bills: 0, payments: 0 };
      monthMap.set(key, { ...existing, bills: existing.bills + bill.amount });
    }

    for (const payment of filteredPayments) {
      const [day, month, year] = payment.date.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
      const existing = monthMap.get(key) || { bills: 0, payments: 0 };
      monthMap.set(key, {
        ...existing,
        payments: existing.payments + payment.amount,
      });
    }

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredBills, filteredPayments]);

  const projectWiseData = useMemo(() => {
    const projectMap = new Map<string, { bills: number; payments: number }>();

    for (const bill of filteredBills) {
      const project = projects.find((p) => p.id === bill.projectId);
      if (project) {
        const existing = projectMap.get(project.name) || {
          bills: 0,
          payments: 0,
        };
        projectMap.set(project.name, {
          ...existing,
          bills: existing.bills + bill.amount,
        });
      }
    }

    for (const payment of filteredPayments) {
      const project = projects.find((p) => p.id === payment.projectId);
      if (project) {
        const existing = projectMap.get(project.name) || {
          bills: 0,
          payments: 0,
        };
        projectMap.set(project.name, {
          ...existing,
          payments: existing.payments + payment.amount,
        });
      }
    }

    return Array.from(projectMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .slice(0, 10);
  }, [filteredBills, filteredPayments, projects]);

  const paymentModeData = useMemo(() => {
    const modeMap = new Map<string, { account: number; cash: number }>();

    for (const payment of filteredPayments) {
      const project = projects.find((p) => p.id === payment.projectId);
      if (project) {
        const existing = modeMap.get(project.name) || { account: 0, cash: 0 };
        if (payment.paymentMode === "account") {
          modeMap.set(project.name, {
            ...existing,
            account: existing.account + payment.amount,
          });
        } else {
          modeMap.set(project.name, {
            ...existing,
            cash: existing.cash + payment.amount,
          });
        }
      }
    }

    return Array.from(modeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .slice(0, 10);
  }, [filteredPayments, projects]);

  const outstandingGstData = useMemo(() => {
    const projectOutstanding = new Map<string, number>();

    for (const bill of filteredBills) {
      const project = projects.find((p) => p.id === bill.projectId);
      if (project) {
        const existing = projectOutstanding.get(project.name) || 0;
        projectOutstanding.set(project.name, existing + bill.amount);
      }
    }

    for (const payment of filteredPayments) {
      const project = projects.find((p) => p.id === payment.projectId);
      if (project) {
        const existing = projectOutstanding.get(project.name) || 0;
        projectOutstanding.set(project.name, existing - payment.amount);
      }
    }

    return Array.from(projectOutstanding.entries())
      .filter(([_, outstanding]) => outstanding > 0)
      .map(([name, outstanding]) => {
        const gst = outstanding * 0.18;
        const outstandingWithGst = outstanding + gst;
        return {
          name,
          value: outstandingWithGst,
          outstanding,
          gst,
        };
      })
      .slice(0, 8);
  }, [filteredBills, filteredPayments, projects]);

  const billsDistributionData = useMemo(() => {
    const projectBills = new Map<string, number>();

    for (const bill of filteredBills) {
      const project = projects.find((p) => p.id === bill.projectId);
      if (project) {
        const existing = projectBills.get(project.name) || 0;
        projectBills.set(project.name, existing + bill.amount);
      }
    }

    return Array.from(projectBills.entries())
      .map(([name, value]) => ({ name, value }))
      .slice(0, 8);
  }, [filteredBills, projects]);

  const paymentsTrendData = useMemo(() => {
    const monthMap = new Map<string, number>();

    for (const payment of filteredPayments) {
      const [day, month, year] = payment.date.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
      const existing = monthMap.get(key) || 0;
      monthMap.set(key, existing + payment.amount);
    }

    return Array.from(monthMap.entries())
      .map(([month, payments]) => ({ month, payments }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredPayments]);

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedClient("all");
    setSelectedYear("all");
    setSelectedFinancialYear("all");
    setStartDate("");
    setEndDate("");
  };

  const uniqueClients = Array.from(new Set(projects.map((p) => p.client)));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) =>
    (currentYear - 5 + i).toString(),
  );
  const financialYears = Array.from({ length: 11 }, (_, i) =>
    (currentYear - 5 + i).toString(),
  );

  const COLORS = [
    "#0078D7",
    "#28A745",
    "#FFA500",
    "#D32F2F",
    "#9C27B0",
    "#00BCD4",
    "#FF5722",
    "#795548",
  ];

  const exportChartCSV = (chartName: string, data: any[]) => {
    try {
      let csvContent = "";

      switch (chartName) {
        case "monthly":
          csvContent = "Month,Bills,Payments\n";
          for (const row of data) {
            csvContent += `${row.month},${row.bills},${row.payments}\n`;
          }
          break;
        case "projectWise":
          csvContent = "Project,Bills,Payments\n";
          for (const row of data) {
            csvContent += `${row.name},${row.bills},${row.payments}\n`;
          }
          break;
        case "paymentMode":
          csvContent = "Project,Account,Cash\n";
          for (const row of data) {
            csvContent += `${row.name},${row.account},${row.cash}\n`;
          }
          break;
        case "outstanding":
          csvContent = "Project,Outstanding,GST (18%),Outstanding with GST\n";
          for (const row of data) {
            csvContent += `${row.name},${row.outstanding},${row.gst},${row.value}\n`;
          }
          break;
        case "billsDistribution":
          csvContent = "Project,Amount\n";
          for (const row of data) {
            csvContent += `${row.name},${row.value}\n`;
          }
          break;
        case "paymentsTrend":
          csvContent = "Month,Payments\n";
          for (const row of data) {
            csvContent += `${row.month},${row.payments}\n`;
          }
          break;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${chartName}_chart_data.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Chart data exported successfully");
    } catch (_error) {
      toast.error("Failed to export chart data");
    }
  };

  const _projectOptions = projects.map((p) => ({ id: p.id, label: p.name }));

  const getProjectDisplayText = () => {
    if (selectedProjects.length === 0) return "All Projects";
    const selectedNames = selectedProjects
      .map((id) => projects.find((p) => p.id === id)?.name)
      .filter(Boolean);
    return selectedNames.join(", ");
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5]">
      {/* Header with Filters Toggle */}
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 text-[#333333] hover:bg-gray-100 font-normal"
        >
          <Settings2 className="h-4 w-4" />
          {filterOpen ? "Hide Filters" : "Show Filters"}
          {filterOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {filterOpen && (
        <Card className="shadow-sm bg-[#FFFEF0] border-[#E8E6D0] rounded-lg animate-in slide-in-from-top-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[#555555]" />
                <h3 className="text-sm font-bold text-[#555555]">Filters</h3>
                {(selectedProjects.length > 0 ||
                  selectedClient !== "all" ||
                  selectedYear !== "all" ||
                  selectedFinancialYear !== "all" ||
                  startDate ||
                  endDate) && (
                  <span className="text-xs bg-[#0078D7] text-white px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-[#0078D7] hover:text-[#005a9e] hover:bg-transparent h-7 text-xs font-normal"
              >
                Clear
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Project
                  </Label>
                  <div className="h-9">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-white h-9 text-xs font-normal"
                          title={getProjectDisplayText()}
                        >
                          <span className="truncate">
                            {getProjectDisplayText()}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50 ml-2 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={project.id}
                                checked={selectedProjects.includes(project.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedProjects([
                                      ...selectedProjects,
                                      project.id,
                                    ]);
                                  } else {
                                    setSelectedProjects(
                                      selectedProjects.filter(
                                        (id) => id !== project.id,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={project.id}
                                className="text-xs cursor-pointer flex-1 font-normal"
                              >
                                {project.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Client
                  </Label>
                  <Select
                    value={selectedClient}
                    onValueChange={setSelectedClient}
                  >
                    <SelectTrigger className="bg-white h-9 text-xs font-normal">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {uniqueClients.map((client) => (
                        <SelectItem key={client} value={client}>
                          {client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Year
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-white h-9 text-xs font-normal">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Financial Year
                  </Label>
                  <Select
                    value={selectedFinancialYear}
                    onValueChange={setSelectedFinancialYear}
                  >
                    <SelectTrigger className="bg-white h-9 text-xs font-normal">
                      <SelectValue placeholder="All Financial Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Financial Years</SelectItem>
                      {financialYears.map((fy) => (
                        <SelectItem key={fy} value={fy}>
                          {fy}-{Number.parseInt(fy) + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Start Date
                  </Label>
                  <DateInput
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="dd-mm-yyyy"
                    className="bg-white h-9 text-xs font-normal"
                  />
                </div>

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    End Date
                  </Label>
                  <DateInput
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="dd-mm-yyyy"
                    className="bg-white h-9 text-xs font-normal"
                  />
                </div>
              </div>

              {!isDateRangeValid && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2">
                  <p className="text-xs text-red-600 font-normal">
                    Invalid date range: End Date must be after Start Date
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-normal text-[#555555]">
              Total Bills
            </CardTitle>
            <FileText className="h-6 w-6 text-[#0078D7]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#0078D7] mb-1">
              {formatCurrency(totalBills)}
            </div>
            <p className="text-sm text-[#555555] font-normal">
              {billsCount} bills generated
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 border-green-300 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-normal text-[#555555]">
              Received Payments
            </CardTitle>
            <CreditCard className="h-6 w-6 text-[#28A745]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#28A745] mb-1">
              {formatCurrency(totalPayments)}
            </div>
            <p className="text-sm text-[#555555] font-normal">
              {paymentsCount} payments received
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-normal text-[#555555]">
              Outstanding
            </CardTitle>
            <AlertCircle className="h-6 w-6 text-[#FFA500]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#FFA500] mb-1">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-sm text-[#555555] font-normal">
              Pending collection
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Monthly Bills vs Payments
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("monthly")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#555555", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "#555555", fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="bills"
                  fill="#D32F2F"
                  name="Bills"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="payments"
                  fill="#28A745"
                  name="Payments"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Bills & Payments – Project Wise
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("projectWise")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectWiseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#555555", fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fill: "#555555", fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="bills"
                  fill="#D32F2F"
                  name="Bills"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="payments"
                  fill="#28A745"
                  name="Payments"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Payment Mode Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("paymentMode")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentModeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#555555", fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fill: "#555555", fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="account"
                  fill="#28A745"
                  name="Account"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cash"
                  fill="#000000"
                  name="Cash"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Outstanding with GST (18%)
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("outstanding")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outstandingGstData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) =>
                    `${entry.name}: ${formatLakhCroreCurrency(entry.value)}`
                  }
                  labelLine={false}
                >
                  {outstandingGstData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(_value: number, _name: string, props: any) => {
                    const entry = props.payload;
                    return [
                      `Outstanding: ${formatCurrency(entry.outstanding)}, GST: ${formatCurrency(entry.gst)}, Total: ${formatCurrency(entry.value)}`,
                      entry.name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Bills Distribution
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("billsDistribution")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={billsDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) => {
                    const percent = ((entry.value / totalBills) * 100).toFixed(
                      1,
                    );
                    return `${entry.name}: ${percent}%`;
                  }}
                  labelLine={false}
                >
                  {billsDistributionData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#555555]">
              Payments Trend
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomedChart("paymentsTrend")}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:shadow-md transition-all"
            >
              <ZoomIn className="h-5 w-5 text-[#0078D7]" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paymentsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#555555", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "#555555", fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="payments"
                  stroke="#28A745"
                  strokeWidth={3}
                  name="Payments"
                  dot={{ fill: "#28A745", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <ChartZoomModal
        open={zoomedChart === "monthly"}
        onClose={() => setZoomedChart(null)}
        title="Monthly Bills vs Payments"
        onExportCSV={() => exportChartCSV("monthly", monthlyData)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="month" tick={{ fill: "#555555", fontSize: 14 }} />
            <YAxis
              tick={{ fill: "#555555", fontSize: 14 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "16px" }} />
            <Bar
              dataKey="bills"
              fill="#D32F2F"
              name="Bills"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="payments"
              fill="#28A745"
              name="Payments"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartZoomModal>

      <ChartZoomModal
        open={zoomedChart === "projectWise"}
        onClose={() => setZoomedChart(null)}
        title="Bills & Payments – Project Wise"
        onExportCSV={() => exportChartCSV("projectWise", projectWiseData)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={projectWiseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#555555", fontSize: 13 }}
              angle={-45}
              textAnchor="end"
              height={150}
            />
            <YAxis
              tick={{ fill: "#555555", fontSize: 14 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "16px" }} />
            <Bar
              dataKey="bills"
              fill="#D32F2F"
              name="Bills"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="payments"
              fill="#28A745"
              name="Payments"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartZoomModal>

      <ChartZoomModal
        open={zoomedChart === "paymentMode"}
        onClose={() => setZoomedChart(null)}
        title="Payment Mode Analysis"
        onExportCSV={() => exportChartCSV("paymentMode", paymentModeData)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={paymentModeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#555555", fontSize: 13 }}
              angle={-45}
              textAnchor="end"
              height={150}
            />
            <YAxis
              tick={{ fill: "#555555", fontSize: 14 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "16px" }} />
            <Bar
              dataKey="account"
              fill="#28A745"
              name="Account"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="cash"
              fill="#000000"
              name="Cash"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartZoomModal>

      <ChartZoomModal
        open={zoomedChart === "outstanding"}
        onClose={() => setZoomedChart(null)}
        title="Outstanding with GST (18%)"
        onExportCSV={() => exportChartCSV("outstanding", outstandingGstData)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={outstandingGstData}
              cx="50%"
              cy="50%"
              outerRadius={250}
              fill="#8884d8"
              dataKey="value"
              label={(entry) =>
                `${entry.name}: ${formatLakhCroreCurrency(entry.value)}`
              }
              labelLine={true}
            >
              {outstandingGstData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(_value: number, _name: string, props: any) => {
                const entry = props.payload;
                return [
                  `Outstanding: ${formatCurrency(entry.outstanding)}, GST: ${formatCurrency(entry.gst)}, Total: ${formatCurrency(entry.value)}`,
                  entry.name,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartZoomModal>

      <ChartZoomModal
        open={zoomedChart === "billsDistribution"}
        onClose={() => setZoomedChart(null)}
        title="Bills Distribution"
        onExportCSV={() =>
          exportChartCSV("billsDistribution", billsDistributionData)
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={billsDistributionData}
              cx="50%"
              cy="50%"
              innerRadius={120}
              outerRadius={250}
              fill="#8884d8"
              dataKey="value"
              label={(entry) => {
                const percent = ((entry.value / totalBills) * 100).toFixed(1);
                return `${entry.name}: ${percent}%`;
              }}
              labelLine={true}
            >
              {billsDistributionData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </ChartZoomModal>

      <ChartZoomModal
        open={zoomedChart === "paymentsTrend"}
        onClose={() => setZoomedChart(null)}
        title="Payments Trend"
        onExportCSV={() => exportChartCSV("paymentsTrend", paymentsTrendData)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={paymentsTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="month" tick={{ fill: "#555555", fontSize: 14 }} />
            <YAxis
              tick={{ fill: "#555555", fontSize: 14 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "16px" }} />
            <Line
              type="monotone"
              dataKey="payments"
              stroke="#28A745"
              strokeWidth={4}
              name="Payments"
              dot={{ fill: "#28A745", r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartZoomModal>
    </div>
  );
}
