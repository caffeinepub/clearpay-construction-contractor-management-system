import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Printer, FileDown, FileUp, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useGetAllPayments, useGetAllProjects, useAddPayment, useUpdatePayment, useDeletePayment, useGetCallerUserRole, useImportPayments } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Payment, PaymentMode, UserRole } from '../backend';
import { Badge } from '@/components/ui/badge';
import { MultiSelectFilter } from '../components/MultiSelectFilter';
import { ActionButton } from '../components/ActionButton';
import { Button } from '@/components/ui/button';
import { DateInput } from '../components/DateInput';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  exportToCSV, 
  exportPaymentsToPDF, 
  downloadPaymentsTemplate, 
  parseCSV, 
  validatePaymentCSVData,
  formatPaymentsForExport 
} from '../lib/exportUtils';

type SortField = 'date' | 'project' | 'amount' | 'paymentMode' | 'reference' | null;
type SortDirection = 'asc' | 'desc' | null;

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    paymentDate: '',
    projectId: '',
    paymentAmount: 0,
    paymentMode: PaymentMode.account,
    reference: '',
    remarks: '',
  });

  const { data: payments = [] } = useGetAllPayments();
  const { data: projects = [] } = useGetAllProjects();
  const { data: userRole } = useGetCallerUserRole();
  const addPayment = useAddPayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const importPayments = useImportPayments();

  const isAdmin = userRole === UserRole.admin;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1 inline text-[#0078D7]" />;
    }
    return <ArrowDown className="h-4 w-4 ml-1 inline text-[#0078D7]" />;
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      if (selectedProjects.length > 0 && !selectedProjects.includes(payment.projectId)) return false;
      if (selectedPaymentMode !== 'all' && payment.paymentMode !== selectedPaymentMode) return false;
      if (referenceFilter && payment.reference !== referenceFilter) return false;
      if (fromDate && payment.date < fromDate) return false;
      if (toDate && payment.date > toDate) return false;
      return true;
    });

    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'date':
            const [aDay, aMonth, aYear] = a.date.split('-').map(Number);
            const [bDay, bMonth, bYear] = b.date.split('-').map(Number);
            aValue = new Date(aYear, aMonth - 1, aDay).getTime();
            bValue = new Date(bYear, bMonth - 1, bDay).getTime();
            break;
          case 'project':
            aValue = getProjectName(a.projectId).toLowerCase();
            bValue = getProjectName(b.projectId).toLowerCase();
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'paymentMode':
            aValue = a.paymentMode;
            bValue = b.paymentMode;
            break;
          case 'reference':
            aValue = a.reference.toLowerCase();
            bValue = b.reference.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [payments, selectedProjects, selectedPaymentMode, referenceFilter, fromDate, toDate, sortField, sortDirection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.paymentAmount || !formData.paymentDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
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
        await updatePayment.mutateAsync(paymentData);
        toast.success('Payment updated successfully');
      } else {
        await addPayment.mutateAsync(paymentData);
        toast.success('Payment added successfully');
      }

      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      paymentDate: payment.date,
      projectId: payment.projectId,
      paymentAmount: payment.amount,
      paymentMode: payment.paymentMode,
      reference: payment.reference,
      remarks: payment.remarks || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      try {
        await deletePayment.mutateAsync(id);
        toast.success('Payment deleted successfully');
      } catch (error: any) {
        toast.error(error.message || 'Delete failed');
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(new Set(filteredPayments.map(p => p.id)));
    } else {
      setSelectedPaymentIds(new Set());
    }
  };

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    const newSelected = new Set(selectedPaymentIds);
    if (checked) {
      newSelected.add(paymentId);
    } else {
      newSelected.delete(paymentId);
    }
    setSelectedPaymentIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedPaymentIds.size === 0) {
      toast.error('Please select at least one payment');
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (bulkDeletePassword !== '3554') {
      toast.error('Incorrect password. Bulk delete failed.');
      return;
    }

    try {
      const deletePromises = Array.from(selectedPaymentIds).map(id => 
        deletePayment.mutateAsync(id)
      );
      await Promise.all(deletePromises);
      toast.success(`Successfully deleted ${selectedPaymentIds.size} payments`);
      setSelectedPaymentIds(new Set());
      setIsBulkDeleteDialogOpen(false);
      setBulkDeletePassword('');
    } catch (error: any) {
      toast.error(error.message || 'Bulk delete failed');
    }
  };

  const handleExportPDF = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }
    try {
      exportPaymentsToPDF(filteredPayments, projects, 'Payments Report');
      toast.success('PDF export window opened');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }
    const formattedData = formatPaymentsForExport(filteredPayments, projects);
    exportToCSV(formattedData, 'payments');
    toast.success('CSV exported successfully');
  };

  const handleDownloadTemplate = () => {
    downloadPaymentsTemplate();
    toast.success('Payments template downloaded successfully');
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        toast.error('No data found in CSV file');
        setIsImporting(false);
        return;
      }

      const { valid, invalid } = validatePaymentCSVData(parsedData, projects);

      if (invalid.length > 0) {
        console.warn('Invalid rows:', invalid);
        const errorMessages = invalid.map(inv => `Row ${inv.row}: ${inv.error}`).join('\n');
        console.error('Validation errors:\n', errorMessages);
        toast.error(`${invalid.length} invalid rows found. Check console for details.`, {
          duration: 5000,
        });
      }

      if (valid.length === 0) {
        toast.error('No valid payments found in CSV file. Please check the format and data.');
        setIsImporting(false);
        return;
      }

      await importPayments.mutateAsync(valid);
      
      if (invalid.length > 0) {
        toast.success(`Successfully imported ${valid.length} payments. ${invalid.length} rows skipped due to errors.`, {
          duration: 5000,
        });
      } else {
        toast.success(`Successfully imported ${valid.length} payments`);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import CSV. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      paymentDate: '',
      projectId: '',
      paymentAmount: 0,
      paymentMode: PaymentMode.account,
      reference: '',
      remarks: '',
    });
    setEditingPayment(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedPaymentMode('all');
    setReferenceFilter('');
    setFromDate('');
    setToDate('');
  };

  const projectOptions = projects.map(p => ({ id: p.id, label: p.name }));

  const allSelected = filteredPayments.length > 0 && selectedPaymentIds.size === filteredPayments.length;
  const someSelected = selectedPaymentIds.size > 0 && selectedPaymentIds.size < filteredPayments.length;

  return (
    <div className="p-6 space-y-6 bg-[#F5F5F5] min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
        <ActionButton icon={Printer} label="Print" onClick={() => window.print()} variant="payments" />
        <ActionButton icon={FileDown} label="Export PDF" onClick={handleExportPDF} variant="payments" />
        <ActionButton 
          icon={FileUp} 
          label="Import CSV" 
          onClick={handleImportCSV}
          disabled={isImporting || !isAdmin}
          variant="payments"
        />
        <ActionButton icon={FileDown} label="Export CSV" onClick={handleExportCSV} variant="payments" />
        <ActionButton icon={FileDown} label="Download Format" onClick={handleDownloadTemplate} variant="payments" />
        {isAdmin && selectedPaymentIds.size > 0 && (
          <Button
            onClick={handleBulkDelete}
            className="h-9 px-3 py-1.5 rounded-lg font-normal text-sm transition-all duration-200 bg-[#FF0000] hover:bg-[#CC0000] text-white border-[#FF0000] hover:border-[#CC0000] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Delete
          </Button>
        )}
        {isAdmin && (
          <div className="ml-auto">
            <ActionButton 
              icon={Plus} 
              label="New Payment" 
              variant="primary"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }} 
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 font-normal text-[#555555] hover:text-[#333333]"
        >
          {showFilters ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Filters
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Filters
            </>
          )}
        </Button>
      </div>

      {showFilters && (
        <Card className="shadow-md bg-[#E8F5E9] border-[#C8E6C9] rounded-xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-normal mb-2 block text-[#555555]">Projects</Label>
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
                  <Label className="text-sm font-normal mb-2 block text-[#555555]">Payment Mode</Label>
                  <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
                    <SelectTrigger className="bg-white h-9">
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      <SelectItem value={PaymentMode.account}>Account</SelectItem>
                      <SelectItem value={PaymentMode.cash}>Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-normal mb-2 block text-[#555555]">Reference</Label>
                  <Input
                    type="text"
                    placeholder="Exact reference text"
                    value={referenceFilter}
                    onChange={(e) => setReferenceFilter(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-normal mb-2 block text-[#555555]">From Date</Label>
                  <DateInput
                    value={fromDate}
                    onChange={setFromDate}
                    placeholder="dd-mm-yyyy"
                    className="bg-white h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm font-normal mb-2 block text-[#555555]">To Date</Label>
                  <DateInput
                    value={toDate}
                    onChange={setToDate}
                    placeholder="dd-mm-yyyy"
                    className="bg-white h-9"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#555555] font-normal">Showing {filteredPayments.length} of {payments.length} payments</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="font-normal"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-bold text-[#555555]">Payment List ({filteredPayments.length} payments)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        className={someSelected ? 'data-[state=checked]:bg-[#0078D7]' : ''}
                      />
                    </TableHead>
                  )}
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'date' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('date')}
                  >
                    Payment Date{getSortIcon('date')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'project' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('project')}
                  >
                    Project Name{getSortIcon('project')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'amount' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('amount')}
                  >
                    Payment Amount{getSortIcon('amount')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'paymentMode' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('paymentMode')}
                  >
                    Payment Mode{getSortIcon('paymentMode')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'reference' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('reference')}
                  >
                    Reference{getSortIcon('reference')}
                  </TableHead>
                  <TableHead className="font-bold">Remarks</TableHead>
                  {isAdmin && <TableHead className="font-bold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-500 font-normal">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment, index) => {
                    const isSelected = selectedPaymentIds.has(payment.id);
                    const isNegative = payment.amount < 0;
                    
                    // Determine row background color
                    let rowClass = '';
                    if (isNegative) {
                      // Negative amount: soft light yellow background overrides zebra striping
                      rowClass = 'bg-[#FFF9C4]';
                    } else if (isSelected) {
                      // Selected: blue background
                      rowClass = 'bg-blue-50';
                    } else {
                      // Normal zebra striping
                      rowClass = index % 2 === 0 ? 'bg-[#E8F5E9]' : '';
                    }
                    
                    // Determine hover class
                    let hoverClass = '';
                    if (isNegative) {
                      // Negative amount: slightly darker yellow on hover
                      hoverClass = 'hover:bg-[#FFF59D]';
                    } else if (isSelected) {
                      // Selected: darker blue on hover
                      hoverClass = 'hover:bg-blue-100';
                    } else {
                      // Normal hover
                      hoverClass = index % 2 === 0 ? 'hover:bg-[#C8E6C9]' : 'hover:bg-gray-50';
                    }
                    
                    return (
                      <TableRow 
                        key={payment.id}
                        className={`${rowClass} ${hoverClass} transition-colors`}
                      >
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)}
                              aria-label={`Select payment ${payment.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-normal">{payment.date}</TableCell>
                        <TableCell className="font-normal">{getProjectName(payment.projectId)}</TableCell>
                        <TableCell className={`font-normal ${isNegative ? 'text-[#FF0000]' : ''}`}>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={payment.paymentMode === PaymentMode.account ? 'default' : 'secondary'}
                            className={payment.paymentMode === PaymentMode.account ? 'bg-green-100 text-green-800 font-normal' : 'bg-gray-100 text-gray-800 font-normal'}
                          >
                            {payment.paymentMode === PaymentMode.account ? 'Account' : 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-normal">{payment.reference || '–'}</TableCell>
                        <TableCell className="font-normal">{payment.remarks || '–'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(payment)}
                                title="Edit payment"
                              >
                                <Pencil className="h-4 w-4 text-[#0078D7]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(payment.id)}
                                title="Delete payment"
                              >
                                <Trash2 className="h-4 w-4 text-[#D32F2F]" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#E8F5E9] border-[#28A745] border-2 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#333333]">
              {editingPayment ? 'Edit Payment' : 'New Payment'}
            </DialogTitle>
            <p className="text-sm text-gray-500 font-normal">Record a new payment for a project</p>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="projectId" className="text-sm font-normal text-[#333333]">
                Project <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger className="mt-1 rounded-md h-10 font-normal">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id} className="font-normal">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentDate" className="text-sm font-normal text-[#333333]">
                Date <span className="text-red-500">*</span>
              </Label>
              <DateInput
                id="paymentDate"
                value={formData.paymentDate}
                onChange={(value) => setFormData({ ...formData, paymentDate: value })}
                placeholder="dd-mm-yyyy"
                required
                className="mt-1 h-10 font-normal"
              />
            </div>

            <div>
              <Label htmlFor="paymentAmount" className="text-sm font-normal text-[#333333]">
                Amount <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center mt-1 border border-gray-300 rounded-md h-10 px-3">
                <span className="text-gray-600 mr-2 font-normal">₹</span>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                  required
                  className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 font-normal"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMode" className="text-sm font-normal text-[#333333]">
                Payment Mode <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={formData.paymentMode === PaymentMode.account ? 'default' : 'outline'}
                  className={`flex-1 rounded-full h-12 font-normal ${
                    formData.paymentMode === PaymentMode.account
                      ? 'bg-[#28A745] hover:bg-[#218838] text-white'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, paymentMode: PaymentMode.account })}
                >
                  Account
                </Button>
                <Button
                  type="button"
                  variant={formData.paymentMode === PaymentMode.cash ? 'default' : 'outline'}
                  className={`flex-1 rounded-full h-12 font-normal ${
                    formData.paymentMode === PaymentMode.cash
                      ? 'bg-[#28A745] hover:bg-[#218838] text-white'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, paymentMode: PaymentMode.cash })}
                >
                  Cash
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="reference" className="text-sm font-normal text-[#333333]">
                Reference
              </Label>
              <Input
                id="reference"
                type="text"
                placeholder="Enter reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="mt-1 rounded-md h-10 font-normal"
              />
            </div>

            <div>
              <Label htmlFor="remarks" className="text-sm font-normal text-[#333333]">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                placeholder="Enter any remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="mt-1 rounded-md font-normal"
                rows={4}
              />
            </div>

            <DialogFooter className="gap-2 pt-4 flex justify-end sticky bottom-0 bg-[#E8F5E9] pb-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#28A745] hover:bg-[#218838] text-white rounded-md font-normal"
                disabled={addPayment.isPending || updatePayment.isPending}
              >
                {addPayment.isPending || updatePayment.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#333333]">
              Confirm Bulk Delete
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-normal">
              You are about to delete {selectedPaymentIds.size} selected payment{selectedPaymentIds.size > 1 ? 's' : ''}. This action cannot be undone. Please enter your password to confirm bulk deletion.
            </p>
            
            <div>
              <Label htmlFor="bulkDeletePassword" className="text-sm font-normal text-[#333333]">
                Enter Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bulkDeletePassword"
                type="password"
                placeholder="Please enter your password to confirm bulk deletion"
                value={bulkDeletePassword}
                onChange={(e) => setBulkDeletePassword(e.target.value)}
                className="mt-1 rounded-md h-10 font-normal"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsBulkDeleteDialogOpen(false);
                setBulkDeletePassword('');
              }}
              className="rounded-md font-normal"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-md font-normal"
              onClick={confirmBulkDelete}
              disabled={deletePayment.isPending}
            >
              {deletePayment.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
