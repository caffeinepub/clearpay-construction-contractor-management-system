import { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Printer, FileDown, FileUp, Trash, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useGetAllBills, useGetAllProjects, useAddBill, useUpdateBill, useDeleteBill, useGetCallerUserRole, useImportBills, useBulkDeleteBillsWithPassword } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Bill, UserRole, BillKey } from '../backend';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectFilter } from '../components/MultiSelectFilter';
import { ActionButton } from '../components/ActionButton';
import { Button } from '@/components/ui/button';
import { DateInput } from '../components/DateInput';
import { 
  exportToCSV, 
  exportBillsToPDF, 
  downloadBillsTemplate, 
  parseCSV, 
  validateBillCSVData,
  formatBillsForExport 
} from '../lib/exportUtils';

type SortField = 'date' | 'project' | 'client' | 'blockId' | 'billNo' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'totalAmount' | null;
type SortDirection = 'asc' | 'desc' | null;

export default function BillsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [blockIdFilter, setBlockIdFilter] = useState('');
  const [billNumberFilter, setBillNumberFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [financialYearFilter, setFinancialYearFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBills, setSelectedBills] = useState<BillKey[]>([]);
  const [bulkDeletePassword, setBulkDeletePassword] = useState('');
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<BillKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    date: '',
    projectId: '',
    blockId: '',
    billNumber: '',
    description: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    remarks: '',
  });

  const { data: bills = [] } = useGetAllBills();
  const { data: projects = [] } = useGetAllProjects();
  const { data: userRole } = useGetCallerUserRole();
  const addBill = useAddBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const importBills = useImportBills();
  const bulkDeleteBillsWithPassword = useBulkDeleteBillsWithPassword();

  const isAdmin = userRole === UserRole.admin;

  // Get unique clients from projects
  const clientOptions = useMemo(() => {
    const uniqueClients = new Set<string>();
    projects.forEach(p => {
      if (p.client) uniqueClients.add(p.client);
    });
    return Array.from(uniqueClients).sort().map(client => ({ id: client, label: client }));
  }, [projects]);

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

  const filteredBills = useMemo(() => {
    let filtered = bills.filter(bill => {
      if (selectedProjects.length > 0 && !selectedProjects.includes(bill.projectId)) return false;

      if (selectedClients.length > 0) {
        const project = projects.find(p => p.id === bill.projectId);
        if (!project || !selectedClients.includes(project.client)) return false;
      }

      if (blockIdFilter) {
        const billBlockId = bill.blockId || '';
        if (!billBlockId.toLowerCase().includes(blockIdFilter.toLowerCase())) return false;
      }

      if (billNumberFilter) {
        const billNum = bill.billNumber || '';
        if (billNum !== billNumberFilter) return false;
      }

      if (yearFilter !== 'all') {
        const billYear = bill.date.split('-')[2];
        if (billYear !== yearFilter) return false;
      }

      if (financialYearFilter !== 'all') {
        const [day, month, year] = bill.date.split('-').map(Number);
        const billDate = new Date(year, month - 1, day);
        const fyStart = parseInt(financialYearFilter);
        const fyEnd = fyStart + 1;
        const fyStartDate = new Date(fyStart, 3, 1);
        const fyEndDate = new Date(fyEnd, 2, 31);
        if (billDate < fyStartDate || billDate > fyEndDate) return false;
      }

      if (startDateFilter) {
        const [startDay, startMonth, startYear] = startDateFilter.split('-').map(Number);
        const [billDay, billMonth, billYear] = bill.date.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const billDate = new Date(billYear, billMonth - 1, billDay);
        if (billDate < startDate) return false;
      }

      if (endDateFilter) {
        const [endDay, endMonth, endYear] = endDateFilter.split('-').map(Number);
        const [billDay, billMonth, billYear] = bill.date.split('-').map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        const billDate = new Date(billYear, billMonth - 1, billDay);
        if (billDate > endDate) return false;
      }

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
            const aProject = projects.find(p => p.id === a.projectId);
            const bProject = projects.find(p => p.id === b.projectId);
            aValue = (aProject?.name || '').toLowerCase();
            bValue = (bProject?.name || '').toLowerCase();
            break;
          case 'client':
            const aClientProject = projects.find(p => p.id === a.projectId);
            const bClientProject = projects.find(p => p.id === b.projectId);
            aValue = (aClientProject?.client || '').toLowerCase();
            bValue = (bClientProject?.client || '').toLowerCase();
            break;
          case 'blockId':
            aValue = (a.blockId || '').toLowerCase();
            bValue = (b.blockId || '').toLowerCase();
            break;
          case 'billNo':
            aValue = (a.billNumber || '').toLowerCase();
            bValue = (b.billNumber || '').toLowerCase();
            break;
          case 'description':
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
            break;
          case 'quantity':
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case 'unit':
            aValue = a.unit.toLowerCase();
            bValue = b.unit.toLowerCase();
            break;
          case 'unitPrice':
            aValue = a.unitPrice;
            bValue = b.unitPrice;
            break;
          case 'totalAmount':
            aValue = a.amount;
            bValue = b.amount;
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
  }, [bills, selectedProjects, selectedClients, blockIdFilter, billNumberFilter, yearFilter, financialYearFilter, startDateFilter, endDateFilter, projects, sortField, sortDirection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.date || !formData.billNumber || !formData.quantity || !formData.unitPrice || !formData.unit || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unitPrice);

      if (isNaN(quantity) || isNaN(unitPrice)) {
        toast.error('Quantity and Unit Price must be valid numbers');
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
        await updateBill.mutateAsync(billData);
        toast.success('Bill updated successfully');
      } else {
        await addBill.mutateAsync(billData);
        toast.success('Bill added successfully');
      }

      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.message || 'Operation failed';
      if (errorMessage.includes('This bill number already entered in this project')) {
        toast.error('This bill number already entered in this project.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormData({
      date: bill.date,
      projectId: bill.projectId,
      blockId: bill.blockId || '',
      billNumber: bill.billNumber,
      description: bill.description,
      quantity: bill.quantity.toString(),
      unit: bill.unit,
      unitPrice: bill.unitPrice.toString(),
      remarks: bill.remarks || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (billKey: BillKey) => {
    setDeleteConfirmBill(null);
    try {
      await deleteBill.mutateAsync(billKey);
      toast.success('Bill deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBills.length === 0) {
      toast.error('No bills selected');
      return;
    }

    if (bulkDeletePassword !== '3554') {
      toast.error('Incorrect password. Bulk delete failed.');
      return;
    }

    try {
      await bulkDeleteBillsWithPassword.mutateAsync({ password: bulkDeletePassword, billKeys: selectedBills });
      toast.success(`${selectedBills.length} bill(s) deleted successfully`);
      setSelectedBills([]);
      setShowBulkDeleteDialog(false);
      setBulkDeletePassword('');
    } catch (error: any) {
      toast.error(error.message || 'Bulk delete failed');
    }
  };

  const handleExportPDF = () => {
    if (filteredBills.length === 0) {
      toast.error('No bills to export');
      return;
    }
    try {
      exportBillsToPDF(filteredBills, projects, 'Bills Report');
      toast.success('PDF export window opened');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCSV = () => {
    if (filteredBills.length === 0) {
      toast.error('No bills to export');
      return;
    }
    const formattedData = formatBillsForExport(filteredBills, projects);
    exportToCSV(formattedData, 'bills');
    toast.success('CSV exported successfully');
  };

  const handleDownloadTemplate = () => {
    downloadBillsTemplate();
    toast.success('Bills template downloaded successfully');
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

      const { valid, invalid } = validateBillCSVData(parsedData, projects, bills);

      if (invalid.length > 0) {
        console.warn('Invalid rows:', invalid);
        const errorMessages = invalid.map(inv => `Row ${inv.row}: ${inv.error}`).join('\n');
        console.error('Validation errors:\n', errorMessages);
      }

      if (valid.length === 0) {
        toast.error('No valid bills found in CSV file. Please check the format and data.');
        setIsImporting(false);
        return;
      }

      await importBills.mutateAsync(valid);
      
      if (invalid.length > 0) {
        toast.success(`Successfully imported ${valid.length} bills. ${invalid.length} rows skipped due to duplicate Project + Bill No or validation errors.`, {
          duration: 5000,
        });
      } else {
        toast.success(`Successfully imported ${valid.length} bills`);
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

  const handleClearFilters = () => {
    setSelectedProjects([]);
    setSelectedClients([]);
    setBlockIdFilter('');
    setBillNumberFilter('');
    setYearFilter('all');
    setFinancialYearFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const resetForm = () => {
    setFormData({
      date: '',
      projectId: '',
      blockId: '',
      billNumber: '',
      description: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      remarks: '',
    });
    setEditingBill(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const getClientName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.client || 'Unknown';
  };

  const projectOptions = projects.map(p => ({ id: p.id, label: p.name }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 13 }, (_, i) => currentYear - 10 + i);
  const financialYearOptions = Array.from({ length: 13 }, (_, i) => currentYear - 10 + i);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBills(filteredBills.map(b => ({ projectId: b.projectId, billNumber: b.billNumber })));
    } else {
      setSelectedBills([]);
    }
  };

  const handleSelectBill = (billKey: BillKey, checked: boolean) => {
    if (checked) {
      setSelectedBills([...selectedBills, billKey]);
    } else {
      setSelectedBills(selectedBills.filter(b => !(b.projectId === billKey.projectId && b.billNumber === billKey.billNumber)));
    }
  };

  const isBillSelected = (billKey: BillKey) => {
    return selectedBills.some(b => b.projectId === billKey.projectId && b.billNumber === billKey.billNumber);
  };

  const allSelected = filteredBills.length > 0 && filteredBills.every(bill => isBillSelected({ projectId: bill.projectId, billNumber: bill.billNumber }));
  const someSelected = selectedBills.length > 0 && !allSelected;

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
        <ActionButton icon={Printer} label="Print" onClick={() => window.print()} variant="bills" />
        <ActionButton icon={FileDown} label="Export PDF" onClick={handleExportPDF} variant="bills" />
        <ActionButton 
          icon={FileUp} 
          label="Import CSV" 
          onClick={handleImportCSV}
          disabled={isImporting || !isAdmin}
          variant="bills"
        />
        <ActionButton icon={FileDown} label="Export CSV" onClick={handleExportCSV} variant="bills" />
        <ActionButton icon={FileDown} label="Download Format" onClick={handleDownloadTemplate} variant="bills" />
        {isAdmin && selectedBills.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            className="h-9 px-3 py-1.5 rounded-lg"
          >
            <Trash className="h-4 w-4 mr-2" />
            Bulk Delete ({selectedBills.length})
          </Button>
        )}
        {isAdmin && (
          <div className="ml-auto">
            <ActionButton 
              icon={Plus} 
              label="New Bill" 
              variant="primary"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }} 
            />
          </div>
        )}
      </div>

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-[#333333] hover:bg-gray-100 font-normal"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <Card className="shadow-sm bg-[#FFF8E1] border-[#E8E6D0] rounded-lg animate-in">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-[#333333] mb-3">Filter Bills</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Projects</Label>
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
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Client</Label>
                <div className="h-9">
                  <MultiSelectFilter
                    options={clientOptions}
                    selectedIds={selectedClients}
                    onChange={setSelectedClients}
                    placeholder="Select clients..."
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Block ID</Label>
                <Input
                  placeholder="Search by block ID"
                  value={blockIdFilter}
                  onChange={(e) => setBlockIdFilter(e.target.value)}
                  className="h-9 text-sm rounded-md font-normal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Bill No</Label>
                <Input
                  placeholder="Exact bill number"
                  value={billNumberFilter}
                  onChange={(e) => setBillNumberFilter(e.target.value)}
                  className="h-9 text-sm rounded-md font-normal"
                />
              </div>
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-9 text-sm rounded-md font-normal">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">All years</SelectItem>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-sm">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Financial Year</Label>
                <Select value={financialYearFilter} onValueChange={setFinancialYearFilter}>
                  <SelectTrigger className="h-9 text-sm rounded-md font-normal">
                    <SelectValue placeholder="All financial years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">All financial years</SelectItem>
                    {financialYearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-sm">
                        {year}-{year + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">Start Date</Label>
                <DateInput
                  value={startDateFilter}
                  onChange={setStartDateFilter}
                  placeholder="dd-mm-yyyy"
                  className="h-9 text-sm rounded-md font-normal"
                />
              </div>
              <div>
                <Label className="text-xs font-normal mb-1 block text-[#333333]">End Date</Label>
                <DateInput
                  value={endDateFilter}
                  onChange={setEndDateFilter}
                  placeholder="dd-mm-yyyy"
                  className="h-9 text-sm rounded-md font-normal"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E8E6D0]">
              <p className="text-xs text-[#555555] font-normal">
                Showing {filteredBills.length} of {bills.length} bills
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

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-bold text-[#555555]">Bills List ({filteredBills.length} bills)</h3>
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
                        aria-label="Select all bills"
                        className={someSelected ? 'data-[state=checked]:bg-gray-400' : ''}
                      />
                    </TableHead>
                  )}
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'date' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('date')}
                  >
                    Date{getSortIcon('date')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'project' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('project')}
                  >
                    Project{getSortIcon('project')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'client' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('client')}
                  >
                    Client{getSortIcon('client')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'blockId' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('blockId')}
                  >
                    Block ID{getSortIcon('blockId')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'billNo' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('billNo')}
                  >
                    Bill No{getSortIcon('billNo')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'description' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('description')}
                  >
                    Description{getSortIcon('description')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold text-right cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'quantity' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('quantity')}
                  >
                    Quantity{getSortIcon('quantity')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'unit' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('unit')}
                  >
                    Unit{getSortIcon('unit')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold text-right cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'unitPrice' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('unitPrice')}
                  >
                    Unit Price{getSortIcon('unitPrice')}
                  </TableHead>
                  <TableHead 
                    className={`font-bold text-right cursor-pointer hover:bg-gray-100 transition-colors ${sortField === 'totalAmount' ? 'text-[#0078D7]' : ''}`}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total Amount{getSortIcon('totalAmount')}
                  </TableHead>
                  <TableHead className="font-bold">Remarks</TableHead>
                  {isAdmin && <TableHead className="font-bold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 13 : 12} className="text-center py-8 text-gray-500 font-normal">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill, index) => {
                    const isNegative = bill.amount < 0;
                    const billKey: BillKey = { projectId: bill.projectId, billNumber: bill.billNumber };
                    const isSelected = isBillSelected(billKey);
                    
                    let rowClass = '';
                    let hoverClass = '';
                    
                    if (isNegative) {
                      rowClass = 'bg-[#FFFACD]';
                      hoverClass = 'hover:bg-[#FFF9C4]';
                    } else {
                      rowClass = index % 2 === 0 ? 'bg-[#FFEBEE]' : '';
                      hoverClass = index % 2 === 0 ? 'hover:bg-[#FFCDD2]' : 'hover:bg-gray-50';
                    }
                    
                    return (
                      <TableRow 
                        key={`${bill.projectId}-${bill.billNumber}`}
                        className={`${rowClass} ${hoverClass} transition-colors`}
                      >
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectBill(billKey, checked as boolean)}
                              aria-label={`Select bill ${bill.billNumber}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-normal">{bill.date}</TableCell>
                        <TableCell className="font-normal">{getProjectName(bill.projectId)}</TableCell>
                        <TableCell className="font-normal">{getClientName(bill.projectId)}</TableCell>
                        <TableCell className="font-normal">{bill.blockId || '–'}</TableCell>
                        <TableCell className="font-normal">{bill.billNumber}</TableCell>
                        <TableCell className="font-normal">{bill.description}</TableCell>
                        <TableCell className="font-normal text-right">
                          {formatNumber(bill.quantity)}
                        </TableCell>
                        <TableCell className="font-normal">{bill.unit}</TableCell>
                        <TableCell className="font-normal text-right">
                          {formatCurrency(bill.unitPrice)}
                        </TableCell>
                        <TableCell className={`font-normal text-right ${isNegative ? 'text-red-600 font-semibold' : ''}`}>
                          {formatCurrency(bill.amount)}
                        </TableCell>
                        <TableCell className="font-normal">{bill.remarks || '–'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(bill)}
                                title="Edit bill"
                              >
                                <Pencil className="h-4 w-4 text-[#0078D7]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirmBill(billKey)}
                                title="Delete bill"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#E3F2FD] border-[#0078D7] border-2 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#333333]">
              {editingBill ? 'Edit Bill' : 'New Bill'}
            </DialogTitle>
            <p className="text-sm text-gray-500 font-normal">
              Fill in all the bill details. Total amount will be calculated automatically.
            </p>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-sm font-normal text-[#333333]">
                  Date <span className="text-red-500">*</span>
                </Label>
                <DateInput
                  id="date"
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value })}
                  placeholder="dd-mm-yyyy"
                  required
                  className="mt-1 h-10 font-normal"
                />
              </div>

              <div>
                <Label htmlFor="projectId" className="text-sm font-normal text-[#333333]">
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  disabled={!!editingBill}
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
                <Label htmlFor="blockId" className="text-sm font-normal text-[#333333]">
                  Block ID
                </Label>
                <Input
                  id="blockId"
                  placeholder="Enter block ID (optional)"
                  value={formData.blockId}
                  onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                  className="mt-1 rounded-md h-10 font-normal"
                />
              </div>

              <div>
                <Label htmlFor="billNumber" className="text-sm font-normal text-[#333333]">
                  Bill No <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billNumber"
                  placeholder="Enter bill number"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  required
                  disabled={!!editingBill}
                  className="mt-1 rounded-md h-10 font-normal"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-normal text-[#333333]">
                  Description of Item <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="mt-1 rounded-md h-10 font-normal"
                />
              </div>

              <div>
                <Label htmlFor="quantity" className="text-sm font-normal text-[#333333]">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  className="mt-1 rounded-md h-10 font-normal"
                />
              </div>

              <div>
                <Label htmlFor="unit" className="text-sm font-normal text-[#333333]">
                  Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="mt-1 rounded-md h-10 font-normal">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rft" className="font-normal">Rft</SelectItem>
                    <SelectItem value="Sft" className="font-normal">Sft</SelectItem>
                    <SelectItem value="Cuft" className="font-normal">Cuft</SelectItem>
                    <SelectItem value="Rmt" className="font-normal">Rmt</SelectItem>
                    <SelectItem value="Smt" className="font-normal">Smt</SelectItem>
                    <SelectItem value="Cumt" className="font-normal">Cumt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unitPrice" className="text-sm font-normal text-[#333333]">
                  Unit Price (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  placeholder="Enter unit price"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                  className="mt-1 rounded-md h-10 font-normal"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="remarks" className="text-sm font-normal text-[#333333]">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                placeholder="Enter any remarks (optional)"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="mt-1 rounded-md font-normal min-h-[80px]"
              />
            </div>

            {formData.quantity && formData.unitPrice && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800 font-normal">
                  <strong>Total Amount:</strong> {formatNumber(parseFloat(formData.quantity))} × {formatCurrency(parseFloat(formData.unitPrice))} = {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.unitPrice))}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4 flex justify-end sticky bottom-0 bg-[#E3F2FD] pb-4">
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
                disabled={addBill.isPending || updateBill.isPending}
              >
                {addBill.isPending || updateBill.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#555555]">Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#555555] font-normal">
              You are about to delete {selectedBills.length} selected bill(s). This action cannot be undone. Please enter your password to confirm.
            </p>
            <div>
              <Label htmlFor="password" className="text-sm font-normal">Password</Label>
              <Input
                id="password"
                type="password"
                value={bulkDeletePassword}
                onChange={(e) => setBulkDeletePassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1 rounded-md font-normal"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBulkDeleteDialog(false);
                  setBulkDeletePassword('');
                }}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                className="rounded-md font-normal"
              >
                Delete Selected Bills
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmBill !== null} onOpenChange={(open) => !open && setDeleteConfirmBill(null)}>
        <DialogContent className="bg-white rounded-lg shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#555555]">Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#555555] font-normal">
              Are you sure you want to delete this bill? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmBill(null)}
                className="rounded-md font-normal"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmBill && handleDelete(deleteConfirmBill)}
                className="rounded-md font-normal"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
