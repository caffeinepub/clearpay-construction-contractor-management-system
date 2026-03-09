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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Download,
  Eye,
  FileDown,
  HelpCircle,
  Key,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type UserProfile, UserRole } from "../backend";
import { ActionButton } from "../components/ActionButton";
import { AppHeader } from "../components/AppHeader";
import { MultiSelectFilter } from "../components/MultiSelectFilter";
import { SECURITY_QUESTIONS } from "../constants/securityQuestions";
import { useActor } from "../hooks/useActor";
import {
  useAddUser,
  useDeleteUsers,
  useGetAllProjects,
  useListUsers,
  useUpdateUser,
} from "../hooks/useQueries";
import { generatePrincipalId } from "../utils/principalId";

const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

export default function UsersPage() {
  const { data: usersData = [], isLoading } = useListUsers();
  const { data: projects = [] } = useGetAllProjects();
  const { actor } = useActor();
  const addUserMutation = useAddUser();
  const updateUserMutation = useUpdateUser();
  const deleteUsersMutation = useDeleteUsers();

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "add" | "edit">("add");
  const [editingUser, setEditingUser] = useState<{
    principal: Principal;
    profile: UserProfile;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    principal: Principal;
    profile: UserProfile;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Password management modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSetHintModal, setShowSetHintModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Change Password form state
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    hintQuestion: SECURITY_QUESTIONS[0],
    hintAnswer: "",
  });

  // Set Hint form state
  const [setHintForm, setSetHintForm] = useState({
    hintQuestion: SECURITY_QUESTIONS[0],
    hintAnswer: "",
  });

  // Forgot Password form state
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    hintAnswer: "",
    revealedPassword: "",
  });
  const [currentHintQuestion, setCurrentHintQuestion] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    contact: string;
    role: UserRole;
    active: boolean;
    principalId: string;
    accessProjects: string[];
  }>({
    fullName: "",
    email: "",
    contact: "",
    role: UserRole.user,
    active: false,
    principalId: "",
    accessProjects: [],
  });

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return usersData;
    const search = searchTerm.toLowerCase();
    return usersData.filter(
      ([_, profile]) =>
        profile.fullName.toLowerCase().includes(search) ||
        profile.email.toLowerCase().includes(search) ||
        profile.contact.includes(search),
    );
  }, [usersData, searchTerm]);

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({ id: p.id, label: p.name }));
  }, [projects]);

  const handleOpenViewDialog = (principal: Principal, profile: UserProfile) => {
    setDialogMode("view");
    setEditingUser({ principal, profile });
    setFormData({
      fullName: profile.fullName,
      email: profile.email,
      contact: profile.contact,
      role: profile.role,
      active: profile.active,
      principalId: principal.toString(),
      accessProjects: profile.accessProjects || [],
    });
    setShowUserDialog(true);
  };

  const handleOpenAddDialog = () => {
    setDialogMode("add");
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      contact: "",
      role: UserRole.user,
      active: false,
      principalId: generatePrincipalId(),
      accessProjects: [],
    });
    setShowUserDialog(true);
  };

  const handleOpenEditDialog = (principal: Principal, profile: UserProfile) => {
    setDialogMode("edit");
    setEditingUser({ principal, profile });
    setFormData({
      fullName: profile.fullName,
      email: profile.email,
      contact: profile.contact,
      role: profile.role,
      active: profile.active,
      principalId: principal.toString(),
      accessProjects: profile.accessProjects || [],
    });
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!formData.fullName || !formData.email || !formData.contact) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const userProfile: UserProfile = {
        fullName: formData.fullName,
        email: formData.email,
        contact: formData.contact,
        role: formData.role,
        active: formData.active,
        accessProjects: formData.accessProjects,
      };

      if (editingUser) {
        await updateUserMutation.mutateAsync({
          userPrincipal: editingUser.principal,
          profile: userProfile,
        });
        toast.success("User updated successfully");
      } else {
        await addUserMutation.mutateAsync(userProfile);
        toast.success("User added successfully");
      }

      setShowUserDialog(false);
      setFormData({
        fullName: "",
        email: "",
        contact: "",
        role: UserRole.user,
        active: false,
        principalId: "",
        accessProjects: [],
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to save user");
    }
  };

  const handleOpenDeleteDialog = (
    principal: Principal,
    profile: UserProfile,
  ) => {
    setUserToDelete({ principal, profile });
    setDeletePassword("");
    setShowDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (!deletePassword.trim()) {
      toast.error("Please enter password");
      return;
    }

    try {
      await deleteUsersMutation.mutateAsync({
        password: deletePassword,
        principalIds: [userToDelete.principal.toString()],
      });
      toast.success("User deleted successfully");
      setShowDeleteDialog(false);
      setUserToDelete(null);
      setDeletePassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Role",
      "Active",
      "Access",
      "Principal ID",
    ];
    const rows = filteredUsers.map(([principal, profile]) => [
      profile.fullName,
      profile.email,
      profile.contact,
      profile.role === UserRole.admin ? "Admin" : "User",
      profile.active ? "Active" : "Inactive",
      profile.accessProjects && profile.accessProjects.length > 0
        ? profile.accessProjects
            .map((id) => projects.find((p) => p.id === id)?.name || id)
            .join("; ")
        : "All",
      principal.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFormat = () => {
    const headers = ["Full Name", "Phone", "Email", "Role"];
    const sampleRow = ["John Doe", "1234567890", "john@example.com", "user"];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const expectedHeaders = ["Full Name", "Phone", "Email", "Role"];

      if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
        toast.error("Invalid CSV format. Please use the template.");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));

        if (values.length !== 4) continue;

        const [fullName, contact, email, role] = values;

        if (!fullName || !contact || !email || !role) {
          errorCount++;
          continue;
        }

        try {
          const userProfile: UserProfile = {
            fullName,
            email,
            contact,
            role:
              role.toLowerCase() === "admin" ? UserRole.admin : UserRole.user,
            active: false,
            accessProjects: [],
          };

          await addUserMutation.mutateAsync(userProfile);
          successCount++;
        } catch (_error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} user(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} user(s)`);
      }
    };
    input.click();
  };

  // Password management handlers
  const handleOpenChangePasswordModal = async () => {
    setChangePasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      hintQuestion: SECURITY_QUESTIONS[0],
      hintAnswer: "",
    });
    setShowChangePasswordModal(true);
  };

  const handleSaveChangePassword = async () => {
    if (
      !changePasswordForm.oldPassword ||
      !changePasswordForm.newPassword ||
      !changePasswordForm.confirmPassword
    ) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (!changePasswordForm.hintQuestion || !changePasswordForm.hintAnswer) {
      toast.error("Please select a hint question and provide an answer");
      return;
    }

    try {
      if (!actor) throw new Error("Actor not available");

      await actor.changeAdminPassword(
        DEFAULT_ADMIN_EMAIL,
        changePasswordForm.oldPassword,
        changePasswordForm.newPassword,
        changePasswordForm.confirmPassword,
        changePasswordForm.hintQuestion,
        changePasswordForm.hintAnswer,
      );

      toast.success("Password changed successfully");
      setShowChangePasswordModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    }
  };

  const handleOpenSetHintModal = async () => {
    setSetHintForm({
      hintQuestion: SECURITY_QUESTIONS[0],
      hintAnswer: "",
    });
    setShowSetHintModal(true);
  };

  const handleSaveSetHint = async () => {
    if (!setHintForm.hintQuestion || !setHintForm.hintAnswer) {
      toast.error("Please select a hint question and provide an answer");
      return;
    }

    try {
      if (!actor) throw new Error("Actor not available");

      await actor.setHintQuestionAndAnswer(
        setHintForm.hintQuestion,
        setHintForm.hintAnswer,
      );

      toast.success("Hint question and answer set successfully");
      setShowSetHintModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to set hint");
    }
  };

  const handleOpenForgotPasswordModal = async () => {
    try {
      if (!actor) throw new Error("Actor not available");

      const question = await actor.getAdminPasswordQuestion();

      if (!question) {
        toast.error(
          "No hint question has been set. Please contact the administrator.",
        );
        return;
      }

      setCurrentHintQuestion(question);
      setForgotPasswordForm({
        hintAnswer: "",
        revealedPassword: "",
      });
      setShowForgotPasswordModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load hint question");
    }
  };

  const handleVerifyHintAnswer = async () => {
    if (!forgotPasswordForm.hintAnswer) {
      toast.error("Please enter your hint answer");
      return;
    }

    try {
      if (!actor) throw new Error("Actor not available");

      const password = await actor.revealAdminPassword(
        forgotPasswordForm.hintAnswer,
      );

      if (password) {
        setForgotPasswordForm((prev) => ({
          ...prev,
          revealedPassword: password,
        }));
        toast.success("Password revealed successfully");
      } else {
        toast.error("Incorrect answer. Password cannot be shown.");
      }
    } catch (error: any) {
      toast.error(
        error.message || "Incorrect answer. Password cannot be shown.",
      );
    }
  };

  const isDefaultAdmin = (email: string) => email === DEFAULT_ADMIN_EMAIL;

  const getAccessDisplay = (accessProjects: string[]) => {
    if (!accessProjects || accessProjects.length === 0) {
      return "All";
    }
    const projectNames = accessProjects
      .map((id) => projects.find((p) => p.id === id)?.name || id)
      .join(", ");
    return projectNames;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D7] mx-auto mb-4" />
          <p className="text-gray-600 font-normal">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header with User Info */}
      <div className="mb-6">
        <AppHeader />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 mb-6">
        {/* Password Management Buttons */}
        <button
          type="button"
          onClick={handleOpenChangePasswordModal}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-normal text-[#0078D7] hover:bg-gray-50 transition-colors"
        >
          <Key className="h-4 w-4" />
          Change Password
        </button>
        <button
          type="button"
          onClick={handleOpenSetHintModal}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-normal text-[#0078D7] hover:bg-gray-50 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Set Hint
        </button>
        <button
          type="button"
          onClick={handleOpenForgotPasswordModal}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-normal text-[#0078D7] hover:bg-gray-50 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Forgot Password
        </button>

        {/* Existing Action Buttons */}
        <ActionButton icon={Printer} label="Print" onClick={handlePrint} />
        <ActionButton
          icon={FileDown}
          label="Export CSV"
          onClick={handleExportCSV}
        />
        <ActionButton
          icon={Upload}
          label="Import CSV"
          onClick={handleImportCSV}
        />
        <ActionButton
          icon={Download}
          label="Download Format"
          onClick={handleDownloadFormat}
        />
        <ActionButton
          icon={Plus}
          label="New User"
          onClick={handleOpenAddDialog}
          variant="primary"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search users by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Principal ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(([principal, profile], index) => (
                <tr
                  key={principal.toString()}
                  className={index % 2 === 0 ? "bg-white" : "bg-[#F3E5F5]"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    {profile.fullName}
                    {isDefaultAdmin(profile.email) && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Master Admin
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    {profile.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    {profile.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    {profile.role === UserRole.admin ? "Admin" : "User"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal">
                    <span
                      className={`px-2 py-1 text-xs rounded ${profile.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {profile.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 text-sm font-normal text-gray-900 max-w-xs truncate"
                    title={getAccessDisplay(profile.accessProjects)}
                  >
                    {getAccessDisplay(profile.accessProjects)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-500">
                    {principal.toString().substring(0, 20)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenViewDialog(principal, profile)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditDialog(principal, profile)}
                        className="text-green-600 hover:text-green-800"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!isDefaultAdmin(profile.email) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDeleteDialog(principal, profile)
                          }
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View/Add/Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">
              {dialogMode === "view"
                ? "View User"
                : dialogMode === "edit"
                  ? "Edit User"
                  : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="font-bold">
                Full Name *
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Enter full name"
                disabled={dialogMode === "view"}
              />
            </div>
            <div>
              <Label htmlFor="contact" className="font-bold">
                Phone *
              </Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                placeholder="Enter phone number"
                disabled={dialogMode === "view"}
              />
            </div>
            <div>
              <Label htmlFor="email" className="font-bold">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email"
                disabled={
                  dialogMode === "view" ||
                  (!!editingUser && isDefaultAdmin(editingUser.profile.email))
                }
              />
            </div>
            <div>
              <Label htmlFor="role" className="font-bold">
                Role *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
                disabled={dialogMode === "view"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.admin}>Admin</SelectItem>
                  <SelectItem value={UserRole.user}>User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="active" className="font-bold">
                Active Status
              </Label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                  disabled={dialogMode === "view"}
                />
                <Label htmlFor="active" className="font-normal">
                  {formData.active ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
            <div>
              <Label htmlFor="access" className="font-bold">
                Access
              </Label>
              <div className="mt-1">
                {dialogMode === "view" ? (
                  <Input
                    value={getAccessDisplay(formData.accessProjects)}
                    disabled
                    className="bg-gray-100"
                  />
                ) : (
                  <div className="space-y-2">
                    <MultiSelectFilter
                      options={projectOptions}
                      selectedIds={formData.accessProjects}
                      onChange={(selected) =>
                        setFormData({ ...formData, accessProjects: selected })
                      }
                      placeholder="Select projects..."
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            accessProjects: projects.map((p) => p.id),
                          })
                        }
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData({ ...formData, accessProjects: [] })
                        }
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 font-normal">
                      Leave empty for unrestricted access to all projects
                    </p>
                  </div>
                )}
              </div>
            </div>
            {dialogMode === "view" && (
              <div>
                <Label className="font-bold">Principal ID</Label>
                <Input
                  value={formData.principalId}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              {dialogMode === "view" ? "Close" : "Cancel"}
            </Button>
            {dialogMode !== "view" && (
              <Button
                onClick={handleSaveUser}
                disabled={
                  addUserMutation.isPending || updateUserMutation.isPending
                }
              >
                {addUserMutation.isPending || updateUserMutation.isPending
                  ? "Saving..."
                  : "Save User"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-normal text-gray-600">
              Are you sure you want to delete user "
              {userToDelete?.profile.fullName}"?
            </p>
            <div>
              <Label htmlFor="deletePassword" className="font-bold">
                Enter Password to Confirm
              </Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password"
              />
              <p className="text-xs font-normal text-gray-500 mt-1">
                Please enter your password to confirm deletion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUsersMutation.isPending}
            >
              {deleteUsersMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="oldPassword" className="font-bold">
                Old Password *
              </Label>
              <Input
                id="oldPassword"
                type="password"
                value={changePasswordForm.oldPassword}
                onChange={(e) =>
                  setChangePasswordForm({
                    ...changePasswordForm,
                    oldPassword: e.target.value,
                  })
                }
                placeholder="Enter old password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="font-bold">
                New Password *
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={changePasswordForm.newPassword}
                onChange={(e) =>
                  setChangePasswordForm({
                    ...changePasswordForm,
                    newPassword: e.target.value,
                  })
                }
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="font-bold">
                Confirm Password *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={changePasswordForm.confirmPassword}
                onChange={(e) =>
                  setChangePasswordForm({
                    ...changePasswordForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="Confirm new password"
              />
            </div>
            <div>
              <Label htmlFor="changeHintQuestion" className="font-bold">
                Hint Question *
              </Label>
              <Select
                value={changePasswordForm.hintQuestion}
                onValueChange={(value) =>
                  setChangePasswordForm({
                    ...changePasswordForm,
                    hintQuestion: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_QUESTIONS.map((question) => (
                    <SelectItem key={question} value={question}>
                      {question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="changeHintAnswer" className="font-bold">
                Hint Answer *
              </Label>
              <Input
                id="changeHintAnswer"
                value={changePasswordForm.hintAnswer}
                onChange={(e) =>
                  setChangePasswordForm({
                    ...changePasswordForm,
                    hintAnswer: e.target.value,
                  })
                }
                placeholder="Enter hint answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangePasswordModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChangePassword}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Hint Modal */}
      <Dialog open={showSetHintModal} onOpenChange={setShowSetHintModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Set Hint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setHintQuestion" className="font-bold">
                Hint Question *
              </Label>
              <Select
                value={setHintForm.hintQuestion}
                onValueChange={(value) =>
                  setSetHintForm({ ...setHintForm, hintQuestion: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_QUESTIONS.map((question) => (
                    <SelectItem key={question} value={question}>
                      {question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="setHintAnswer" className="font-bold">
                Hint Answer *
              </Label>
              <Input
                id="setHintAnswer"
                value={setHintForm.hintAnswer}
                onChange={(e) =>
                  setSetHintForm({ ...setHintForm, hintAnswer: e.target.value })
                }
                placeholder="Enter hint answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSetHintModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSetHint}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog
        open={showForgotPasswordModal}
        onOpenChange={setShowForgotPasswordModal}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Forgot Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold">Hint Question</Label>
              <Input
                value={currentHintQuestion || ""}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="forgotHintAnswer" className="font-bold">
                Hint Answer *
              </Label>
              <Input
                id="forgotHintAnswer"
                value={forgotPasswordForm.hintAnswer}
                onChange={(e) =>
                  setForgotPasswordForm({
                    ...forgotPasswordForm,
                    hintAnswer: e.target.value,
                  })
                }
                placeholder="Enter hint answer"
                disabled={!!forgotPasswordForm.revealedPassword}
              />
            </div>
            {forgotPasswordForm.revealedPassword && (
              <div>
                <Label className="font-bold">Your Password</Label>
                <Input
                  value={forgotPasswordForm.revealedPassword}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForgotPasswordModal(false)}
            >
              Close
            </Button>
            {!forgotPasswordForm.revealedPassword && (
              <Button onClick={handleVerifyHintAnswer}>Verify</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
