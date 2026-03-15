import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { FileDown, FileUp, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type Client, UserRole } from "../backend";
import { ActionButton } from "../components/ActionButton";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import {
  useAddClient,
  useDeleteClient,
  useGetAllClients,
  useGetCallerUserRole,
  useUpdateClient,
} from "../hooks/useQueries";

export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterContact, setFilterContact] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
  });

  const { data: clients = [] } = useGetAllClients();
  const { data: userRole } = useGetCallerUserRole();
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const isAdmin = userRole === UserRole.admin;

  const filteredClients = clients.filter((client) => {
    if (
      filterName &&
      !client.name.toLowerCase().includes(filterName.toLowerCase())
    )
      return false;
    if (filterContact && !client.contact.includes(filterContact)) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.contact || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    const clientData: Client = {
      id: editingClient?.id || `client_${Date.now()}`,
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      address: formData.address,
      notes: formData.notes,
    };

    if (editingClient) {
      // Show password dialog for edit
      setShowEditPasswordDialog(true);
    } else {
      try {
        await addClient.mutateAsync(clientData);
        toast.success("Client added successfully");
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
      const clientData: Client = {
        id: editingClient!.id,
        name: formData.name,
        contact: formData.contact,
        email: formData.email,
        address: formData.address,
        notes: formData.notes,
      };

      await updateClient.mutateAsync({
        client: clientData,
        password: editPassword,
      });
      toast.success("Client updated successfully");
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

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contact: client.contact,
      email: client.email,
      address: client.address,
      notes: client.notes,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setDeletePassword("");
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    if (!deletePassword.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    try {
      await deleteClient.mutateAsync({
        id: clientToDelete,
        password: deletePassword,
      });
      toast.success("Client deleted successfully");
      setClientToDelete(null);
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
      contact: "",
      email: "",
      address: "",
      notes: "",
    });
    setEditingClient(null);
    setEditPassword("");
  };

  const clearFilters = () => {
    setFilterName("");
    setFilterCompany("");
    setFilterContact("");
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  usePageShortcuts({
    newForm: () => {
      if (isAdmin) setIsFormOpen(true);
    },
    clearFilters,
    resetFilters: clearFilters,
    refreshList: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
    focusSearch: () => {
      const input =
        document.querySelector<HTMLInputElement>("input[placeholder]");
      if (input) {
        input.focus();
        input.select();
      }
    },
    print: () => window.print(),
  });

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5] min-h-screen">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
        {isAdmin && (
          <ActionButton
            icon={Plus}
            label="New Client"
            variant="primary"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          />
        )}
        <ActionButton
          icon={Printer}
          label="Print"
          onClick={() => window.print()}
        />
        <ActionButton icon={FileUp} label="Import CSV" onClick={() => {}} />
        <ActionButton icon={FileDown} label="Export CSV" onClick={() => {}} />
        <ActionButton
          icon={FileDown}
          label="Download Format"
          onClick={() => {}}
        />
      </div>

      {/* Fixed-Position Filter Section */}
      <Card className="shadow-md bg-[#FFFEF0] border-[#E8E6D0] rounded-xl sticky top-0 z-10">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">
                Client Name
              </Label>
              <Input
                placeholder="Filter by client name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">
                Company
              </Label>
              <Input
                placeholder="Filter by company"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">
                Contact Number
              </Label>
              <Input
                placeholder="Filter by contact"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-[#555555]">
              Client List ({filteredClients.length} clients)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Notes</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center text-[#555555] py-8"
                    >
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{client.contact}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.address || "-"}</TableCell>
                      <TableCell>{client.notes || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                            >
                              <Pencil className="h-4 w-4 text-[#0078D7]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(client.id)}
                            >
                              <Trash2 className="h-4 w-4 text-[#D32F2F]" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Client Form Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#555555]">
              {editingClient ? "Edit Client" : "New Client"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Main Form Fields */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="mt-1 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="contact" className="text-sm font-medium">
                    Contact <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    required
                    className="mt-1 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="mt-1 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="mt-1 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1 rounded-md"
                  />
                </div>
              </div>

              {/* Side Answer Box */}
              <div className="md:col-span-1">
                <Card className="bg-purple-50 border-purple-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-[#555555]">
                      Contact Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Contact Format</p>
                      <p className="font-medium">
                        {formData.contact ? "✓ Valid" : "✗ Required"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email Format</p>
                      <p className="font-medium">
                        {formData.email?.includes("@")
                          ? "✓ Valid"
                          : "✗ Invalid"}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-purple-200">
                      <p className="text-xs text-gray-500">Company Details</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Company field will be added in future updates
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 flex justify-end">
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
                disabled={addClient.isPending || updateClient.isPending}
              >
                {addClient.isPending || updateClient.isPending
                  ? "Saving..."
                  : "Save Client"}
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
              Please enter the admin password to confirm editing this client.
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
                disabled={updateClient.isPending}
              >
                {updateClient.isPending ? "Updating..." : "Confirm Edit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={clientToDelete !== null}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <DialogContent className="bg-white rounded-lg shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#555555]">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#555555] font-normal">
              Are you sure you want to delete this client? This action cannot be
              undone.
            </p>
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
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClientToDelete(null);
                  setDeletePassword("");
                }}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="rounded-md font-normal"
                disabled={deleteClient.isPending}
              >
                {deleteClient.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
