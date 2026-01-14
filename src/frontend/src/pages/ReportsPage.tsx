import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, FileDown } from 'lucide-react';
import { useGetAllProjects, useGetAllBills, useGetAllPayments } from '../hooks/useQueries';
import { FileText, CreditCard, AlertCircle, Receipt } from 'lucide-react';
import { MultiSelectFilter } from '../components/MultiSelectFilter';
import { ActionButton } from '../components/ActionButton';

export default function ReportsPage() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const { data: projects = [] } = useGetAllProjects();
  const { data: bills = [] } = useGetAllBills();
  const { data: payments = [] } = useGetAllPayments();

  const filteredBills = bills.filter(b => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(b.projectId)) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(p.projectId)) return false;
    return true;
  });

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

  const totalBills = filteredBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = totalBills - totalPayments;
  const totalGst = totalOutstanding > 0 ? (totalBills * 18) / 100 : 0;

  const projectOptions = projects.map(p => ({ id: p.id, label: p.name }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end gap-2">
        <ActionButton icon={Printer} label="Print" onClick={() => window.print()} />
        <ActionButton icon={FileDown} label="Export PDF" onClick={() => {}} />
        <ActionButton icon={FileDown} label="Export CSV" onClick={() => {}} />
      </div>

      {/* Filter Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Projects</Label>
              <MultiSelectFilter
                options={projectOptions}
                selectedIds={selectedProjects}
                onChange={setSelectedProjects}
                placeholder="Select projects"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">From Date</Label>
              <Input
                type="text"
                placeholder="dd-mm-yyyy"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">To Date</Label>
              <Input
                type="text"
                placeholder="dd-mm-yyyy"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#555555]">Total Bills</CardTitle>
            <FileText className="h-5 w-5 text-[#0078D7]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0078D7]">
              {formatCurrency(totalBills)}
            </div>
            <p className="text-xs text-[#555555] mt-1">{filteredBills.length} bills</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#555555]">Total Payments</CardTitle>
            <CreditCard className="h-5 w-5 text-[#28A745]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#28A745]">
              {formatCurrency(totalPayments)}
            </div>
            <p className="text-xs text-[#555555] mt-1">{filteredPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#555555]">Outstanding</CardTitle>
            <AlertCircle className="h-5 w-5 text-[#FFA500]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#FFA500]">
              {formatCurrency(totalOutstanding > 0 ? totalOutstanding : 0)}
            </div>
            <p className="text-xs text-[#555555] mt-1">Pending amount</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#555555]">GST (18%)</CardTitle>
            <Receipt className="h-5 w-5 text-[#9C27B0]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#9C27B0]">
              {formatCurrency(totalGst)}
            </div>
            <p className="text-xs text-[#555555] mt-1">On outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills Summary */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Bills Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.slice(0, 10).map(bill => (
                  <TableRow key={bill.billNumber}>
                    <TableCell>{bill.blockId || '–'}</TableCell>
                    <TableCell>{getProjectName(bill.projectId)}</TableCell>
                    <TableCell>{bill.date}</TableCell>
                    <TableCell>{formatCurrency(bill.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
