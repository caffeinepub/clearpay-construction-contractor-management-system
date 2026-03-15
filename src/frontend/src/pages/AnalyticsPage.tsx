import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Receipt,
  Settings2,
  Share2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DateInput } from "../components/DateInput";
import {
  useGetAllBills,
  useGetAllClients,
  useGetAllPayments,
  useGetAllProjects,
  useGetCompletedProjectIds,
} from "../hooks/useQueries";

export default function AnalyticsPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedFinancialYear, setSelectedFinancialYear] =
    useState<string>("all");
  const [sortBy, setSortBy] = useState<"outstanding" | "name">("outstanding");
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: projects = [], isLoading: projectsLoading } =
    useGetAllProjects();
  const { data: bills = [], isLoading: billsLoading } = useGetAllBills();
  const { data: payments = [], isLoading: paymentsLoading } =
    useGetAllPayments();
  const { data: _clients = [] } = useGetAllClients();
  const { data: completedProjectIds = [] } = useGetCompletedProjectIds();

  const isLoading = projectsLoading || billsLoading || paymentsLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (completedProjectIds.includes(b.projectId)) return false;
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
    completedProjectIds,
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
      if (completedProjectIds.includes(p.projectId)) return false;
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
    completedProjectIds,
    selectedProjects,
    selectedClient,
    selectedYear,
    selectedFinancialYear,
    startDate,
    endDate,
    projects,
  ]);

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((p) => !completedProjectIds.includes(p.id));

    if (selectedProjects.length > 0) {
      filtered = filtered.filter((p) => selectedProjects.includes(p.id));
    }

    if (selectedClient !== "all") {
      filtered = filtered.filter((p) => p.client === selectedClient);
    }

    return filtered;
  }, [projects, completedProjectIds, selectedProjects, selectedClient]);

  const projectMetrics = useMemo(() => {
    const metrics = filteredProjects.map((project) => {
      const projectBills = filteredBills.filter(
        (b) => b.projectId === project.id,
      );
      const projectPayments = filteredPayments.filter(
        (p) => p.projectId === project.id,
      );

      const totalBills = projectBills.reduce((sum, b) => sum + b.amount, 0);
      const totalPayments = projectPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      const outstanding = totalBills - totalPayments;
      const gst = outstanding > 0 ? (outstanding * 18) / 100 : 0;

      return {
        project,
        totalBills,
        totalPayments,
        outstanding,
        gst,
      };
    });

    // Sort based on selected sort option
    if (sortBy === "outstanding") {
      return metrics.sort((a, b) => b.outstanding - a.outstanding);
    }
    return metrics.sort((a, b) => a.project.name.localeCompare(b.project.name));
  }, [filteredProjects, filteredBills, filteredPayments, sortBy]);

  const totalBills = projectMetrics.reduce((sum, m) => sum + m.totalBills, 0);
  const totalPayments = projectMetrics.reduce(
    (sum, m) => sum + m.totalPayments,
    0,
  );
  const totalOutstanding = projectMetrics.reduce(
    (sum, m) => sum + (m.outstanding > 0 ? m.outstanding : 0),
    0,
  );
  const totalGst = projectMetrics.reduce(
    (sum, m) => sum + (m.outstanding > 0 ? m.gst : 0),
    0,
  );

  const sortedOutstandingData = useMemo(() => {
    const data = projectMetrics
      .map(({ project, outstanding }) => ({
        projectName: project.name,
        outstanding: outstanding,
      }))
      .filter((item) => item.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    return data;
  }, [projectMetrics]);

  const totalOutstandingForChart = sortedOutstandingData.reduce(
    (sum, item) => sum + item.outstanding,
    0,
  );
  const maxOutstanding =
    sortedOutstandingData.length > 0 ? sortedOutstandingData[0].outstanding : 0;

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedClient("all");
    setSelectedYear("all");
    setStartDate("");
    setEndDate("");
    setSelectedFinancialYear("all");
    setSortBy("outstanding");
  };

  const uniqueClients = Array.from(
    new Set(projects.map((p) => p.client)),
  ).sort();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) =>
    (currentYear - 5 + i).toString(),
  );
  const financialYears = Array.from({ length: 11 }, (_, i) =>
    (currentYear - 5 + i).toString(),
  );

  const getProjectDisplayText = () => {
    if (selectedProjects.length === 0) return "All Projects";
    const selectedNames = selectedProjects
      .map((id) => projects.find((p) => p.id === id)?.name)
      .filter(Boolean);
    return selectedNames.join(", ");
  };

  const handleShareChart = async () => {
    if (!chartRef.current) return;

    try {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Failed to create canvas context");
        return;
      }

      // Set canvas dimensions
      const width = 1200;
      const height = 80 + sortedOutstandingData.length * 50 + 100;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = "#2D2D2D";
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = "#4A90A4";
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 24px "Century Gothic", Arial, sans-serif';
      ctx.fillText("Details of Outstanding Amounts", 30, 50);

      ctx.fillStyle = "#FF6B6B";
      ctx.fillText(getTodayDate(), 550, 50);

      // Total amount
      ctx.fillStyle = "#28A745";
      ctx.font = 'bold 28px "Century Gothic", Arial, sans-serif';
      ctx.fillText(formatCurrency(totalOutstandingForChart), 30, 90);

      // Projects label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 14px "Century Gothic", Arial, sans-serif';
      ctx.fillText("PROJECTS", 30, 130);

      // Draw bars
      let yOffset = 160;
      for (const item of sortedOutstandingData) {
        const barWidth =
          maxOutstanding > 0 ? (item.outstanding / maxOutstanding) * 800 : 0;
        const minBarWidth = 120;
        const actualBarWidth = Math.max(barWidth, minBarWidth);

        // Project name
        ctx.fillStyle = "#FFFFFF";
        ctx.font = '14px "Century Gothic", Arial, sans-serif';
        ctx.fillText(item.projectName.substring(0, 30), 30, yOffset);

        // Bar gradient
        const gradient = ctx.createLinearGradient(
          250,
          yOffset - 20,
          250 + actualBarWidth,
          yOffset - 20,
        );
        gradient.addColorStop(0, "#FF8C42");
        gradient.addColorStop(1, "#FFA500");

        ctx.fillStyle = gradient;
        ctx.fillRect(250, yOffset - 25, actualBarWidth, 30);

        // Amount text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = 'bold 14px "Century Gothic", Arial, sans-serif';
        ctx.fillText(
          formatCurrency(item.outstanding),
          250 + actualBarWidth + 10,
          yOffset,
        );

        yOffset += 50;
      }

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }

        const file = new File([blob], "outstanding-chart.png", {
          type: "image/png",
        });

        // Try to share via Web Share API
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Outstanding Amounts Chart",
              text: `Details of Outstanding Amounts - ${getTodayDate()}`,
            });
            toast.success("Chart shared successfully!");
          } catch (error) {
            if ((error as Error).name !== "AbortError") {
              // Fallback to download
              downloadImage(blob);
            }
          }
        } else {
          // Fallback to download
          downloadImage(blob);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error sharing chart:", error);
      toast.error("Failed to share chart");
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "outstanding-chart.png";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Chart downloaded successfully!");
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5] min-h-screen">
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
                  endDate ||
                  sortBy !== "outstanding") && (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Projects
                  </Label>
                  <div className="h-9">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal"
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
                    <SelectTrigger className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal">
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
                    <SelectTrigger className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Financial Year
                  </Label>
                  <Select
                    value={selectedFinancialYear}
                    onValueChange={setSelectedFinancialYear}
                  >
                    <SelectTrigger className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal">
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

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Start Date
                  </Label>
                  <DateInput
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="dd-mm-yyyy"
                    className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal"
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
                    className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal"
                  />
                </div>

                <div>
                  <Label className="text-xs font-normal text-[#555555] mb-1.5 block">
                    Sort By
                  </Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value as "outstanding" | "name")
                    }
                  >
                    <SelectTrigger className="bg-white hover:bg-[#F5F5F5] border-[#BDBDBD] h-9 text-xs font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">
                        Outstanding (High → Low)
                      </SelectItem>
                      <SelectItem value="name">Project Name (A → Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 rounded-xl hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-[#555555]">
              Total Bills
            </CardTitle>
            <FileText className="h-6 w-6 text-[#FFA500]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#FFA500]">
              {isLoading ? "..." : formatCurrency(totalBills)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-green-200 rounded-xl hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-[#555555]">
              Total Payments
            </CardTitle>
            <CreditCard className="h-6 w-6 text-[#28A745]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#28A745]">
              {isLoading ? "..." : formatCurrency(totalPayments)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 rounded-xl hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-[#555555]">
              Total Outstanding
            </CardTitle>
            <AlertCircle className="h-6 w-6 text-[#E91E63]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#E91E63]">
              {isLoading ? "..." : formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-[#555555] mt-1 font-normal">
              Positive outstanding only
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 rounded-xl hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-[#555555]">
              Total GST (18%)
            </CardTitle>
            <Receipt className="h-6 w-6 text-[#9C27B0]" />
          </CardHeader>
          <CardContent>
            <div className="amount-text text-[#9C27B0]">
              {isLoading ? "..." : formatCurrency(totalGst)}
            </div>
            <p className="text-xs text-[#555555] mt-1 font-normal">
              On positive outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projectMetrics.map(
          ({ project, totalBills, totalPayments, outstanding, gst }) => {
            const isOverpaid = outstanding < 0;
            const displayOutstanding =
              outstanding > 0 ? outstanding : Math.abs(outstanding);

            return (
              <Card
                key={project.id}
                className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 border-b border-blue-200">
                  <CardTitle className="text-xl font-bold text-[#0078D7]">
                    {project.name}
                  </CardTitle>
                  <p className="text-sm text-[#555555] mt-1 font-normal">
                    {project.client}
                  </p>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-[#FFA500]" />
                        <span className="text-xs font-bold text-[#555555]">
                          Bills
                        </span>
                      </div>
                      <div className="text-xl font-bold text-[#FFA500]">
                        {formatCurrency(totalBills)}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-[#28A745]" />
                        <span className="text-xs font-bold text-[#555555]">
                          Payments
                        </span>
                      </div>
                      <div className="text-xl font-bold text-[#28A745]">
                        {formatCurrency(totalPayments)}
                      </div>
                    </div>

                    <div
                      className={`${isOverpaid ? "bg-gradient-to-br from-green-50 to-green-100 border-green-200" : "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"} p-4 rounded-lg border hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle
                          className={`h-5 w-5 ${isOverpaid ? "text-[#28A745]" : "text-[#E91E63]"}`}
                        />
                        <span className="text-xs font-bold text-[#555555]">
                          Outstanding
                        </span>
                      </div>
                      <div
                        className={`text-xl font-bold ${isOverpaid ? "text-[#28A745]" : "text-[#E91E63]"}`}
                      >
                        {isOverpaid ? "-" : ""}
                        {formatCurrency(displayOutstanding)}
                      </div>
                      <p className="text-xs text-[#555555] mt-1 font-normal">
                        {isOverpaid ? "Overpaid" : "Pending"}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-5 w-5 text-[#9C27B0]" />
                        <span className="text-xs font-bold text-[#555555]">
                          GST (18%)
                        </span>
                      </div>
                      <div className="text-xl font-bold text-[#9C27B0]">
                        {isOverpaid ? "N/A (Overpaid)" : formatCurrency(gst)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {projectMetrics.length === 0 && !isLoading && (
        <Card className="shadow-md bg-white rounded-xl">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-[#BDBDBD] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#555555] mb-2">
              No Projects Found
            </h3>
            <p className="text-[#757575] font-normal">
              Try adjusting your filters to see more results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Final Summary Outstanding Graph */}
      {sortedOutstandingData.length > 0 && (
        <Card className="shadow-lg bg-[#2D2D2D] border-[#4A90A4] rounded-xl overflow-hidden">
          <div ref={chartRef} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Details of Outstanding Amounts –{" "}
                  <span className="text-[#FF6B6B]">{getTodayDate()}</span>
                </h2>
                <div className="text-3xl font-bold text-[#28A745]">
                  {formatCurrency(totalOutstandingForChart)}
                </div>
              </div>
              <Button
                onClick={handleShareChart}
                className="bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
              >
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-white text-sm font-bold mb-4">
                <div className="w-48 text-left">PROJECTS</div>
                <div className="flex-1" />
              </div>

              {sortedOutstandingData.map((item) => {
                const barWidth =
                  maxOutstanding > 0
                    ? (item.outstanding / maxOutstanding) * 100
                    : 0;

                return (
                  <div
                    key={item.projectName}
                    className="flex items-center gap-4"
                  >
                    <div
                      className="w-48 text-white text-sm font-normal truncate"
                      title={item.projectName}
                    >
                      {item.projectName}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="h-10 bg-gradient-to-r from-[#FF8C42] to-[#FFA500] rounded-md relative overflow-hidden shadow-lg"
                        style={{ width: `${barWidth}%`, minWidth: "120px" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm font-bold drop-shadow-lg">
                        {formatCurrency(item.outstanding)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
