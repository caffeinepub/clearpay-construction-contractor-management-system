import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FileDown,
  FileUp,
  Minus,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Project, UserRole } from "../backend";
import { ActionButton } from "../components/ActionButton";
import { DateInput } from "../components/DateInput";
import { useActor } from "../hooks/useActor";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import {
  useAddProject,
  useDeleteProject,
  useGetAllProjects,
  useGetCallerUserRole,
  useGetCompletedProjectIds,
  useGetProjectMapLocations,
  useSetProjectMapLocation,
  useToggleProjectCompleted,
  useUpdateProject,
} from "../hooks/useQueries";
import {
  downloadProjectsTemplate,
  exportToCSV,
  exportToPDF,
  formatProjectsForExport,
  parseCSV,
} from "../lib/exportUtils";

type SortField =
  | "name"
  | "client"
  | "startDate"
  | "unitPrice"
  | "quantity"
  | "estimatedAmount"
  | "contactNumber"
  | "location";
type SortDirection = "asc" | "desc" | null;

export default function ProjectsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProjectName, setFilterProjectName] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    startDate: "",
    unitPrice: 0,
    unit: "Sqft",
    quantity: 0,
    notes: "",
    address: "",
    contactNumber: "+91",
    location: "",
    mapLocation: "",
    attachmentLink1: "",
    attachmentLink2: "",
  });

  const { data: projects = [] } = useGetAllProjects();
  const { data: userRole } = useGetCallerUserRole();
  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: completedIds = [] } = useGetCompletedProjectIds();
  const toggleCompleted = useToggleProjectCompleted();
  const { data: mapLocations = {} } = useGetProjectMapLocations();
  const setMapLocation = useSetProjectMapLocation();
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(
    new Set(),
  );
  const [optimisticRemoved, setOptimisticRemoved] = useState<Set<string>>(
    new Set(),
  );

  const isCompleted = (id: string) => {
    if (optimisticRemoved.has(id)) return false;
    if (optimisticCompleted.has(id)) return true;
    return completedIds.includes(id);
  };

  const { isMasterAdmin } = useMasterAdmin();
  const { actor } = useActor();
  const isAdmin = isMasterAdmin || userRole === UserRole.admin;

  const handleToggleCompleted = (id: string) => {
    if (!actor) return;
    const currentlyCompleted = isCompleted(id);
    // Optimistic update
    if (currentlyCompleted) {
      setOptimisticRemoved((prev) => new Set([...prev, id]));
      setOptimisticCompleted((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    } else {
      setOptimisticCompleted((prev) => new Set([...prev, id]));
      setOptimisticRemoved((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
    toggleCompleted.mutate(id, {
      onSuccess: () => {
        setOptimisticCompleted(new Set());
        setOptimisticRemoved(new Set());
      },
      onError: () => {
        setOptimisticCompleted(new Set());
        setOptimisticRemoved(new Set());
      },
    });
  };

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (project) =>
          project.name.toLowerCase().includes(searchLower) ||
          project.client.toLowerCase().includes(searchLower) ||
          project.location.toLowerCase().includes(searchLower) ||
          project.contactNumber.includes(searchLower),
      );
    }

    // Apply filters
    if (filterProjectName) {
      result = result.filter((project) =>
        project.name.toLowerCase().includes(filterProjectName.toLowerCase()),
      );
    }

    if (filterClient) {
      result = result.filter((project) =>
        project.client.toLowerCase().includes(filterClient.toLowerCase()),
      );
    }

    if (filterFromDate) {
      result = result.filter((project) => project.startDate >= filterFromDate);
    }

    if (filterToDate) {
      result = result.filter((project) => project.startDate <= filterToDate);
    }

    if (filterMinPrice) {
      const minPrice = Number.parseFloat(filterMinPrice);
      if (!Number.isNaN(minPrice)) {
        result = result.filter((project) => project.unitPrice >= minPrice);
      }
    }

    if (filterMaxPrice) {
      const maxPrice = Number.parseFloat(filterMaxPrice);
      if (!Number.isNaN(maxPrice)) {
        result = result.filter((project) => project.unitPrice <= maxPrice);
      }
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        // Handle date sorting
        if (sortField === "startDate") {
          aVal = new Date(a.startDate.split("-").reverse().join("-")).getTime();
          bVal = new Date(b.startDate.split("-").reverse().join("-")).getTime();
        }

        // Handle numeric sorting
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        // Handle string sorting
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortDirection === "asc") {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        }
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      });
    }

    return result;
  }, [
    projects,
    searchTerm,
    filterProjectName,
    filterClient,
    filterFromDate,
    filterToDate,
    filterMinPrice,
    filterMaxPrice,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
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
      return <ChevronsUpDown className="h-4 w-4 ml-1 inline opacity-40" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="h-4 w-4 ml-1 inline" />;
    }
    return <ChevronDown className="h-4 w-4 ml-1 inline" />;
  };

  const estimatedAmount = useMemo(() => {
    return formData.unitPrice * formData.quantity;
  }, [formData.unitPrice, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.client || !formData.contactNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate contact number format
    if (!formData.contactNumber.startsWith("+91")) {
      toast.error("Contact number must start with +91");
      return;
    }

    const attachmentLinks = [
      formData.attachmentLink1,
      formData.attachmentLink2,
    ].filter((link) => link.trim() !== "");

    const projectData: Project = {
      id: editingProject?.id || `proj_${Date.now()}`,
      name: formData.name,
      client: formData.client,
      startDate: formData.startDate,
      endDate: "",
      unitPrice: formData.unitPrice,
      quantity: formData.quantity,
      estimatedAmount: estimatedAmount,
      contactNumber: formData.contactNumber,
      location: formData.location,
      notes: formData.notes,
      address: formData.address,
      attachmentLinks: attachmentLinks,
    };

    if (editingProject) {
      // Show password dialog for edit
      setShowEditPasswordDialog(true);
    } else {
      try {
        await addProject.mutateAsync(projectData);
        await setMapLocation.mutateAsync({
          projectId: projectData.id,
          location: formData.mapLocation || "",
        });
        toast.success("Project added successfully");
        setIsFormOpen(false);
        resetForm();
      } catch (error: any) {
        toast.error(error.message || "Operation failed");
      }
    }
  };

  const confirmEdit = async () => {
    if (!editPassword.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      const attachmentLinks = [
        formData.attachmentLink1,
        formData.attachmentLink2,
      ].filter((link) => link.trim() !== "");

      const projectData: Project = {
        id: editingProject!.id,
        name: formData.name,
        client: formData.client,
        startDate: formData.startDate,
        endDate: "",
        unitPrice: formData.unitPrice,
        quantity: formData.quantity,
        estimatedAmount: estimatedAmount,
        contactNumber: formData.contactNumber,
        location: formData.location,
        notes: formData.notes,
        address: formData.address,
        attachmentLinks: attachmentLinks,
      };

      await updateProject.mutateAsync({
        project: projectData,
        password: editPassword,
      });
      await setMapLocation.mutateAsync({
        projectId: projectData.id,
        location: formData.mapLocation || "",
      });
      toast.success("Project updated successfully");
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

  const handleView = (project: Project) => {
    setViewingProject(project);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client,
      startDate: project.startDate,
      unitPrice: project.unitPrice,
      unit: "Sqft",
      quantity: project.quantity,
      notes: project.notes,
      address: project.address,
      contactNumber: project.contactNumber,
      location: project.location,
      mapLocation: mapLocations[project.id] || "",
      attachmentLink1: project.attachmentLinks[0] || "",
      attachmentLink2: project.attachmentLinks[1] || "",
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
    setDeletePassword("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    if (!deletePassword.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await deleteProject.mutateAsync({
        id: projectToDelete,
        password: deletePassword,
      });
      toast.success("Project deleted successfully");
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      setDeletePassword("");
    } catch (error: any) {
      if (error.message?.includes("Invalid password")) {
        toast.error("Invalid password. Delete not allowed.");
      } else {
        toast.error(error.message || "Delete failed");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client: "",
      startDate: "",
      unitPrice: 0,
      unit: "Sqft",
      quantity: 0,
      notes: "",
      address: "",
      contactNumber: "+91",
      location: "",
      mapLocation: "",
      attachmentLink1: "",
      attachmentLink2: "",
    });
    setEditingProject(null);
    setEditPassword("");
  };

  const clearFilters = () => {
    setFilterProjectName("");
    setFilterClient("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterMinPrice("");
    setFilterMaxPrice("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Export handlers
  const handleExportCSV = () => {
    const formattedData = formatProjectsForExport(filteredProjects);
    exportToCSV(formattedData, "projects");
    toast.success("Projects exported to CSV");
  };

  const handleExportPDF = () => {
    exportToPDF("Projects Report");
    window.print();
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  usePageShortcuts({
    newForm: () => {
      if (isAdmin) setIsFormOpen(true);
    },
    clearFilters,
    resetFilters: clearFilters,
    refreshList: () =>
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    focusSearch: () => {
      const input =
        document.querySelector<HTMLInputElement>("input[placeholder]");
      if (input) {
        input.focus();
        input.select();
      }
    },
    exportCSV: handleExportCSV,
    exportPDF: handleExportPDF,
    importCSV: () => {
      if (isAdmin) fileInputRef.current?.click();
    },
    print: () => window.print(),
  });

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSV(csvText);

        if (parsedData.length === 0) {
          toast.error("No valid data found in CSV file");
          return;
        }

        let successCount = 0;
        for (const row of parsedData) {
          try {
            const projectData: Project = {
              id: `proj_${Date.now()}_${Math.random()}`,
              name: row.name || row.Project_Name || "",
              client: row.client || row.Client || "",
              startDate: row.startDate || row.Start_Date || "",
              endDate: "",
              unitPrice: Number.parseFloat(
                row.unitPrice || row.Unit_Price || "0",
              ),
              quantity: Number.parseFloat(row.quantity || row.Quantity || "0"),
              estimatedAmount: Number.parseFloat(
                row.estimatedAmount || row.Estimated_Amount || "0",
              ),
              contactNumber: row.contactNumber || row.Contact_Number || "",
              location: row.location || row.Location || "",
              address: row.address || row.Address || "",
              notes: row.notes || row.Notes || "",
              attachmentLinks: [],
            };

            await addProject.mutateAsync(projectData);
            successCount++;
          } catch (error) {
            console.error("Failed to import project:", error);
          }
        }

        toast.success(`Successfully imported ${successCount} project(s)`);
      } catch (error: any) {
        toast.error(error.message || "Import failed");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5] min-h-screen">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
        <ActionButton
          icon={Printer}
          label="Print"
          onClick={() => window.print()}
          variant="projects"
        />
        <ActionButton
          icon={FileDown}
          label="Export PDF"
          onClick={handleExportPDF}
          variant="projects"
        />
        <ActionButton
          icon={FileUp}
          label="Import CSV"
          onClick={() => fileInputRef.current?.click()}
          variant="projects"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />
        <ActionButton
          icon={FileDown}
          label="Export CSV"
          onClick={handleExportCSV}
          variant="projects"
        />
        <ActionButton
          icon={FileDown}
          label="Download Format"
          onClick={downloadProjectsTemplate}
          variant="projects"
        />
        {isAdmin && (
          <div className="ml-auto">
            <ActionButton
              icon={Plus}
              label="New Project"
              variant="primary"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-2xl rounded-md"
        />
      </div>

      {/* Advanced Filters - Compact Design */}
      <div className="bg-[#FFF8E1] py-2 px-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[#555555] text-sm">Advanced Filters</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs px-3 hover:shadow-md transition-shadow"
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen(!filterOpen)}
              className="h-7 text-xs px-3 hover:shadow-md transition-shadow"
            >
              {filterOpen ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>

        {filterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 animate-in slide-in-from-top-2">
            <div>
              <Label className="text-xs font-normal mb-1 block">
                Project Name
              </Label>
              <Input
                placeholder="Project name"
                value={filterProjectName}
                onChange={(e) => setFilterProjectName(e.target.value)}
                className="rounded-md h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-normal mb-1 block">Client</Label>
              <Input
                placeholder="Client name"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="rounded-md h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-normal mb-1 block">
                From Date
              </Label>
              <DateInput
                value={filterFromDate}
                onChange={setFilterFromDate}
                placeholder="dd-mm-yyyy"
                className="rounded-md h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-normal mb-1 block">To Date</Label>
              <DateInput
                value={filterToDate}
                onChange={setFilterToDate}
                placeholder="dd-mm-yyyy"
                className="rounded-md h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-normal mb-1 block">
                Min Unit Price (₹)
              </Label>
              <Input
                type="number"
                placeholder="Min price"
                value={filterMinPrice}
                onChange={(e) => setFilterMinPrice(e.target.value)}
                className="rounded-md h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-normal mb-1 block">
                Max Unit Price (₹)
              </Label>
              <Input
                type="number"
                placeholder="Max price"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                className="rounded-md h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Projects Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-bold text-[#555555]">
              Project List ({filteredProjects.length} projects)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("name")}
                  >
                    Project Name {getSortIcon("name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("client")}
                  >
                    Client {getSortIcon("client")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("startDate")}
                  >
                    Date {getSortIcon("startDate")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("unitPrice")}
                  >
                    Unit Price {getSortIcon("unitPrice")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("quantity")}
                  >
                    Quantity {getSortIcon("quantity")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("estimatedAmount")}
                  >
                    Estimated Amount {getSortIcon("estimatedAmount")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("contactNumber")}
                  >
                    Contact Number {getSortIcon("contactNumber")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("location")}
                  >
                    Location {getSortIcon("location")}
                  </TableHead>
                  <TableHead className="text-center w-24">Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-gray-500"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project, index) => (
                    <TableRow
                      key={project.id}
                      className={
                        isCompleted(project.id)
                          ? "bg-gray-100 opacity-70"
                          : index % 2 === 0
                            ? "bg-[#E3F2FD] hover:bg-[#BBDEFB]"
                            : "hover:bg-gray-50"
                      }
                    >
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>{project.startDate}</TableCell>
                      <TableCell>{formatCurrency(project.unitPrice)}</TableCell>
                      <TableCell>{project.quantity}</TableCell>
                      <TableCell>
                        {formatCurrency(project.estimatedAmount)}
                      </TableCell>
                      <TableCell>{project.contactNumber}</TableCell>
                      <TableCell>{project.location}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCompleted(project.id)}
                            disabled={toggleCompleted.isPending || !actor}
                            className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                              isCompleted(project.id)
                                ? "bg-[#28A745] border-[#28A745]"
                                : "bg-white border-gray-400 hover:border-[#28A745]"
                            } ${!isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            title={
                              isCompleted(project.id)
                                ? "Mark as ongoing"
                                : "Mark as completed"
                            }
                            data-ocid="projects.completed.checkbox"
                          >
                            {isCompleted(project.id) && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                role="img"
                                aria-label="Completed"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(project)}
                            title="View"
                          >
                            <Eye className="h-4 w-4 text-[#0078D7]" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(project)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-[#0078D7]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(project.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-[#D32F2F]" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Project Details Modal */}
      <Dialog
        open={viewingProject !== null}
        onOpenChange={(open) => {
          if (!open) setViewingProject(null);
        }}
      >
        <DialogContent
          data-ocid="projects.view_modal"
          className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#333333]">
              Project Details
            </DialogTitle>
          </DialogHeader>

          {viewingProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Project Name
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Client
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.client}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Start Date
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.startDate || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Contact Number
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.contactNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Unit Price
                  </p>
                  <p className="text-sm text-[#333333]">
                    {formatCurrency(viewingProject.unitPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Quantity
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Estimated Amount
                  </p>
                  <p className="text-sm text-[#333333]">
                    {formatCurrency(viewingProject.estimatedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Location
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.location || "—"}
                  </p>
                </div>
                {mapLocations[viewingProject.id] && (
                  <div>
                    <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                      Map Location
                    </p>
                    <p className="text-sm text-[#333333] mb-1">
                      {mapLocations[viewingProject.id]}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(mapLocations[viewingProject.id] || "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#0078D7] hover:underline font-semibold"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        role="img"
                        aria-label="Map pin"
                      >
                        <title>Map pin</title>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>

              {viewingProject.address && (
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Address
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.address}
                  </p>
                </div>
              )}

              {viewingProject.notes && (
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-[#333333]">
                    {viewingProject.notes}
                  </p>
                </div>
              )}

              {(viewingProject.attachmentLinks[0] ||
                viewingProject.attachmentLinks[1]) && (
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-2">
                    Attachments
                  </p>
                  <div className="space-y-2">
                    {viewingProject.attachmentLinks[0] && (
                      <div>
                        <span className="text-xs text-[#555555] mr-2">
                          Link 1:
                        </span>
                        <a
                          href={viewingProject.attachmentLinks[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0078D7] underline hover:text-[#005a9e] break-all"
                        >
                          {viewingProject.attachmentLinks[0]}
                        </a>
                      </div>
                    )}
                    {viewingProject.attachmentLinks[1] && (
                      <div>
                        <span className="text-xs text-[#555555] mr-2">
                          Link 2:
                        </span>
                        <a
                          href={viewingProject.attachmentLinks[1]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0078D7] underline hover:text-[#005a9e] break-all"
                        >
                          {viewingProject.attachmentLinks[1]}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              data-ocid="projects.view.close_button"
              onClick={() => setViewingProject(null)}
              className="bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-md"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Form Dialog - Two Column Layout */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#333333]">
              {editingProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="name"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="mt-1 rounded-md h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="startDate"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Project Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="mt-1 rounded-md h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="unit"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Unit <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger className="mt-1 rounded-md h-10">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sqft">Sqft</SelectItem>
                      <SelectItem value="Nos">Nos</SelectItem>
                      <SelectItem value="Lumpsum">Lumpsum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="estimatedAmount"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Estimated Amount
                  </Label>
                  <div className="flex items-center mt-1 rounded-md h-10 bg-gray-100 px-3 border border-gray-300">
                    <span className="text-gray-600 mr-2">₹</span>
                    <span className="text-gray-700">
                      {estimatedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="notes"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Project Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter project notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="mt-1 rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="address"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter project address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="mt-1 rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="attachmentLink1"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Attachment Link 1
                  </Label>
                  <Input
                    id="attachmentLink1"
                    type="url"
                    placeholder="Enter attachment link"
                    value={formData.attachmentLink1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attachmentLink1: e.target.value,
                      })
                    }
                    className="mt-1 rounded-md h-10"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="client"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="client"
                    placeholder="Enter client name"
                    value={formData.client}
                    onChange={(e) =>
                      setFormData({ ...formData, client: e.target.value })
                    }
                    required
                    className="mt-1 rounded-md h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="unitPrice"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Unit Price <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center flex-1 border border-gray-300 rounded-md h-10 px-3">
                      <span className="text-gray-600 mr-2">₹</span>
                      <Input
                        id="unitPrice"
                        type="number"
                        value={formData.unitPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            unitPrice: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          unitPrice: Math.max(0, formData.unitPrice - 1),
                        })
                      }
                      className="rounded-md h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          unitPrice: formData.unitPrice + 1,
                        })
                      }
                      className="rounded-md h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="quantity"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Estimated Quantity <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="rounded-md h-10 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          quantity: Math.max(0, formData.quantity - 1),
                        })
                      }
                      className="rounded-md h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          quantity: formData.quantity + 1,
                        })
                      }
                      className="rounded-md h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="location"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="mt-1 rounded-md h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="mapLocation"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Map Location
                  </Label>
                  <Input
                    id="mapLocation"
                    placeholder="Example: 17.502186, 78.292149"
                    value={formData.mapLocation}
                    onChange={(e) =>
                      setFormData({ ...formData, mapLocation: e.target.value })
                    }
                    className="mt-1 rounded-md h-10"
                    data-ocid="project.map_location.input"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="contactNumber"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactNumber"
                    placeholder="+91 9876543210"
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactNumber: e.target.value,
                      })
                    }
                    required
                    className="mt-1 rounded-md h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="attachmentLink2"
                    className="text-sm font-normal text-[#333333]"
                  >
                    Attachment Link 2
                  </Label>
                  <Input
                    id="attachmentLink2"
                    type="url"
                    placeholder="Enter attachment link"
                    value={formData.attachmentLink2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attachmentLink2: e.target.value,
                      })
                    }
                    className="mt-1 rounded-md h-10"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 flex justify-end sticky bottom-0 bg-white pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#28A745] hover:bg-[#218838] text-white rounded-md"
                disabled={addProject.isPending || updateProject.isPending}
              >
                {addProject.isPending || updateProject.isPending
                  ? "Saving..."
                  : "Save Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Password Confirmation Dialog */}
      <Dialog
        open={showEditPasswordDialog}
        onOpenChange={setShowEditPasswordDialog}
      >
        <DialogContent className="bg-white rounded-lg shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#555555]">
              Confirm Edit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#555555] font-normal">
              Please enter the admin password to confirm editing this project.
            </p>
            <div>
              <Label htmlFor="editPassword" className="text-sm font-normal">
                Admin Password
              </Label>
              <Input
                id="editPassword"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1 rounded-md font-normal"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditPasswordDialog(false);
                  setEditPassword("");
                }}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmEdit}
                className="rounded-md font-normal bg-[#28A745] hover:bg-[#218838]"
                disabled={updateProject.isPending}
              >
                {updateProject.isPending ? "Updating..." : "Confirm Edit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white rounded-lg shadow-lg max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#555555]">
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#555555] font-normal">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deletePassword" className="text-sm font-normal">
                Admin Password
              </Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1 rounded-md font-normal"
              />
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => {
                setProjectToDelete(null);
                setDeletePassword("");
              }}
              className="rounded-md font-normal"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-[#D32F2F] hover:bg-[#B71C1C] rounded-md font-normal"
            >
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
