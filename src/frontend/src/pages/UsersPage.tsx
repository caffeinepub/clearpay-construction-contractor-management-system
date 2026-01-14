import { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileDown, FileUp, Pencil, Trash2 } from 'lucide-react';
import { useGetAllUsers, useAddUser, useUpdateUser, useDeleteUser, useToggleUserActiveStatus, useImportUsers } from '../hooks/useQueries';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from '../components/ActionButton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';
import type { UserProfile } from '../backend';
import { UserRole } from '../backend';
import { exportToCSV, parseCSV, exportToPDF } from '../lib/exportUtils';

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ principal: string; profile: UserProfile } | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [formData, setFormData] = useState({
    fullName: '',
    contact: '',
    email: '',
    role: UserRole.user,
    active: false,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: usersData = [], isLoading } = useGetAllUsers();
  const addUserMutation = useAddUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleActiveStatusMutation = useToggleUserActiveStatus();
  const importUsersMutation = useImportUsers();

  // Filter users based on filter inputs
  const filteredUsers = useMemo(() => {
    return usersData.filter(([principal, profile]) => {
      const matchesName = !filterName || profile.fullName.toLowerCase().includes(filterName.toLowerCase());
      const matchesContact = !filterContact || profile.contact.includes(filterContact);
      const matchesEmail = !filterEmail || profile.email.toLowerCase().includes(filterEmail.toLowerCase());
      const matchesRole = filterRole === 'all' || profile.role === filterRole;
      
      return matchesName && matchesContact && matchesEmail && matchesRole;
    });
  }, [usersData, filterName, filterContact, filterEmail, filterRole]);

  const clearFilters = () => {
    setFilterName('');
    setFilterContact('');
    setFilterEmail('');
    setFilterRole('all');
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      contact: '',
      email: '',
      role: UserRole.user,
      active: false,
    });
    setIsEditMode(false);
    setSelectedUser(null);
  };

  const handleAddUser = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditUser = (principal: string, profile: UserProfile) => {
    setSelectedUser({ principal, profile });
    setFormData({
      fullName: profile.fullName,
      contact: profile.contact,
      email: profile.email,
      role: profile.role,
      active: profile.active,
    });
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteUser = (principal: string, profile: UserProfile) => {
    setSelectedUser({ principal, profile });
    setDeletePassword('');
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    if (deletePassword !== '3554') {
      toast.error('Invalid password. User deletion not allowed.');
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ user: Principal.fromText(selectedUser.principal), password: deletePassword });
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      setDeletePassword('');
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleToggleActiveStatus = async (principal: string, currentStatus: boolean) => {
    try {
      await toggleActiveStatusMutation.mutateAsync({
        user: Principal.fromText(principal),
        active: !currentStatus,
      });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Toggle active status error:', error);
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast.error('Please enter full name');
      return;
    }

    if (!formData.contact.trim()) {
      toast.error('Please enter contact number');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter email address');
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const profile: UserProfile = {
        fullName: formData.fullName.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        role: formData.role,
        active: formData.active,
      };

      if (isEditMode && selectedUser) {
        await updateUserMutation.mutateAsync({
          user: Principal.fromText(selectedUser.principal),
          profile,
        });
        toast.success('User updated successfully');
      } else {
        // Generate a unique Principal ID for new user
        const randomPrincipal = Principal.fromUint8Array(crypto.getRandomValues(new Uint8Array(29)));
        await addUserMutation.mutateAsync({
          user: randomPrincipal,
          profile,
        });
        toast.success('User added successfully');
      }

      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save user error:', error);
      toast.error(error.message || 'Failed to save user');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }

    const exportData = filteredUsers.map(([principal, profile]) => ({
      'Full Name': profile.fullName,
      'Email': profile.email,
      'Contact Number': profile.contact,
      'Role': profile.role,
      'Status': profile.active ? 'Active' : 'Inactive',
      'Created Date': new Date().toLocaleDateString('en-IN'),
    }));

    exportToCSV(exportData, 'users', ['Full Name', 'Email', 'Contact Number', 'Role', 'Status', 'Created Date']);
    toast.success('Users exported to CSV');
  };

  // Export PDF
  const handleExportPDF = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }

    const tableRows = filteredUsers.map(([principal, profile]) => {
      return `
        <tr>
          <td>${profile.fullName}</td>
          <td>${profile.email}</td>
          <td>${profile.contact}</td>
          <td style="text-align: center;">${profile.role}</td>
          <td style="text-align: center;">${profile.active ? 'Active' : 'Inactive'}</td>
          <td style="text-align: center;">${new Date().toLocaleDateString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const content = `
      <h1>Users Report</h1>
      <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
      <p>Total Users: ${filteredUsers.length}</p>
      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Contact Number</th>
            <th style="text-align: center;">Role</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Created Date</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    exportToPDF(content, 'users_report');
    toast.success('Users exported to PDF');
  };

  // Download CSV template
  const handleDownloadFormat = () => {
    const templateData = [{
      'Full Name': 'John Doe',
      'Email': 'john.doe@example.com',
      'Contact Number': '+911234567890',
      'Role': 'user',
      'Status': 'Inactive',
      'Created Date': new Date().toLocaleDateString('en-IN'),
    }];

    exportToCSV(templateData, 'users_template', ['Full Name', 'Email', 'Contact Number', 'Role', 'Status', 'Created Date']);
    toast.success('Template downloaded');
  };

  // Import CSV
  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      // Validate CSV structure
      const requiredColumns = ['Full Name', 'Email', 'Contact Number', 'Role', 'Status'];
      const headers = Object.keys(rows[0]);
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Parse and validate users
      const usersToImport: Array<[Principal, UserProfile]> = [];
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because of header and 0-index

        try {
          // Validate required fields
          if (!row['Full Name'] || !row['Full Name'].trim()) {
            errors.push(`Row ${rowNum}: Full Name is required`);
            continue;
          }

          if (!row['Contact Number'] || !row['Contact Number'].trim()) {
            errors.push(`Row ${rowNum}: Contact Number is required`);
            continue;
          }

          if (!row['Email'] || !row['Email'].trim()) {
            errors.push(`Row ${rowNum}: Email is required`);
            continue;
          }

          if (!validateEmail(row['Email'].trim())) {
            errors.push(`Row ${rowNum}: Invalid email format`);
            continue;
          }

          // Validate role
          const role = row['Role']?.trim().toLowerCase();
          if (role !== 'admin' && role !== 'user') {
            errors.push(`Row ${rowNum}: Role must be "admin" or "user"`);
            continue;
          }

          // Parse active status (default to Inactive if not specified or invalid)
          const status = row['Status']?.trim().toLowerCase();
          const active = status === 'active';

          // Generate unique Principal ID for each user
          const randomPrincipal = Principal.fromUint8Array(crypto.getRandomValues(new Uint8Array(29)));

          const profile: UserProfile = {
            fullName: row['Full Name'].trim(),
            contact: row['Contact Number'].trim(),
            email: row['Email'].trim(),
            role: role === 'admin' ? UserRole.admin : UserRole.user,
            active,
          };

          usersToImport.push([randomPrincipal, profile]);
        } catch (error: any) {
          errors.push(`Row ${rowNum}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        toast.error(`Import failed with ${errors.length} error(s). Check console for details.`);
        console.error('Import errors:', errors);
        return;
      }

      if (usersToImport.length === 0) {
        toast.error('No valid users to import');
        return;
      }

      // Import users
      await importUsersMutation.mutateAsync(usersToImport);
      toast.success(`Successfully imported ${usersToImport.length} user(s)`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import users');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5] min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
        <ActionButton 
          icon={Plus} 
          label="Add User" 
          variant="primary" 
          onClick={handleAddUser} 
        />
        <ActionButton icon={FileUp} label="Import CSV" onClick={handleImportCSV} />
        <ActionButton icon={FileDown} label="Export CSV" onClick={handleExportCSV} />
        <ActionButton icon={FileDown} label="Export PDF" onClick={handleExportPDF} />
        <ActionButton icon={FileDown} label="Download Format" onClick={handleDownloadFormat} />
      </div>

      {/* Filter Section */}
      <Card className="shadow-md bg-[#FFFEF0] border-[#E8E6D0] rounded-xl">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">Name</Label>
              <Input
                placeholder="Filter by name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">Contact</Label>
              <Input
                placeholder="Filter by contact"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">Email</Label>
              <Input
                placeholder="Filter by email"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[#555555]">Role</Label>
              <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Users Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-[#555555]">
              User List ({filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(([principal, profile], index) => {
                    const principalStr = principal.toString();
                    return (
                      <TableRow key={principalStr} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}>
                        <TableCell className="font-medium">{profile.fullName}</TableCell>
                        <TableCell>{profile.contact}</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={profile.role === 'admin' ? 'default' : 'secondary'}
                            className={profile.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                          >
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={profile.active}
                              onCheckedChange={() => handleToggleActiveStatus(principalStr, profile.active)}
                              disabled={toggleActiveStatusMutation.isPending}
                            />
                            <span className={profile.active ? 'text-green-600 font-medium' : 'text-gray-500'}>
                              {profile.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditUser(principalStr, profile)}
                            >
                              <Pencil className="h-4 w-4 text-[#0078D7]" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteUser(principalStr, profile)}
                            >
                              <Trash2 className="h-4 w-4 text-[#D32F2F]" />
                            </Button>
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

      {/* User Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#333333]">
              {isEditMode ? 'Edit User' : 'New User'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium text-[#333333]">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="mt-1 rounded-md h-10"
              />
            </div>

            <div>
              <Label htmlFor="contact" className="text-sm font-medium text-[#333333]">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact"
                placeholder="+91 9876543210"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
                className="mt-1 rounded-md h-10"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[#333333]">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1 rounded-md h-10"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium text-[#333333]">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="mt-1 rounded-md h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.admin}>Admin</SelectItem>
                  <SelectItem value={UserRole.user}>User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
              />
              <Label htmlFor="active" className="text-sm font-medium text-[#333333] cursor-pointer">
                Active (User can access the application)
              </Label>
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
                disabled={addUserMutation.isPending || updateUserMutation.isPending}
              >
                {addUserMutation.isPending || updateUserMutation.isPending ? 'Saving...' : isEditMode ? 'Update User' : 'Save User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white rounded-lg shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#555555]">Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#555555] font-normal">
              Are you sure you want to delete user "{selectedUser?.profile.fullName}"? This action cannot be undone and will immediately revoke their access.
            </p>
            <div>
              <Label htmlFor="deletePassword" className="text-sm font-normal">Admin Password</Label>
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
                  setIsDeleteDialogOpen(false);
                  setSelectedUser(null);
                  setDeletePassword('');
                }}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="rounded-md font-normal"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
