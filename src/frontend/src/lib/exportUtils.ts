import { Project, Bill, Payment, PaymentMode } from '../backend';

// ============ CSV UTILITIES ============

export function exportToCSV(data: any[], filename: string, headers?: string[]) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const csvHeaders = headers || Object.keys(data[0]);
  
  const csvContent = [
    csvHeaders.join(','),
    ...data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ CSV TEMPLATE GENERATORS ============

export function downloadProjectsTemplate() {
  const headers = ['name', 'client', 'startDate', 'unitPrice', 'quantity', 'estimatedAmount', 'contactNumber', 'location', 'address', 'notes'];
  const sampleData = [{
    name: 'Sample Project',
    client: 'Sample Client',
    startDate: '01-01-2024',
    unitPrice: '1000',
    quantity: '100',
    estimatedAmount: '100000',
    contactNumber: '+911234567890',
    location: 'Sample Location',
    address: 'Sample Address',
    notes: 'Sample notes'
  }];
  
  exportToCSV(sampleData, 'projects_template', headers);
}

export function downloadBillsTemplate() {
  // Exact column order as specified: Date, Project, Block ID, Bill No, Description, Quantity, Unit, Unit Price, Total Amount, Remarks
  const headers = ['Date', 'Project', 'Block ID', 'Bill No', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Remarks'];
  const sampleData = [{
    'Date': '01-01-2026',
    'Project': 'Sample Project',
    'Block ID': 'Block A',
    'Bill No': '1001',
    'Description': 'Construction',
    'Quantity': '100',
    'Unit': 'Sft',
    'Unit Price': '500',
    'Total Amount': '50000',
    'Remarks': 'First floor work'
  }];
  
  exportToCSV(sampleData, 'bills_template', headers);
}

export function downloadPaymentsTemplate() {
  // Exact column order as specified: Project, Date, Amount Paid, Payment Mode, Reference, Remarks
  const headers = ['Project', 'Date', 'Amount Paid', 'Payment Mode', 'Reference', 'Remarks'];
  const sampleData = [{
    'Project': 'Sample Project',
    'Date': '31-12-2025',
    'Amount Paid': '10000',
    'Payment Mode': 'Account',
    'Reference': 'Harsha',
    'Remarks': 'Payment for first phase'
  }];
  
  exportToCSV(sampleData, 'payments_template', headers);
}

// ============ CSV IMPORT PARSER ============

export function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });
      data.push(row);
    }
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// ============ CSV DATA VALIDATORS ============

export function validateBillCSVData(data: any[], projects: Project[], existingBills: Bill[]): { valid: Bill[]; invalid: any[] } {
  const valid: Bill[] = [];
  const invalid: any[] = [];
  const seenBillCombinations = new Set<string>();

  // Expected columns: Date, Project, Block ID, Bill No, Description, Quantity, Unit, Unit Price, Total Amount, Remarks
  const expectedColumns = ['Date', 'Project', 'Block ID', 'Bill No', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Remarks'];

  data.forEach((row, index) => {
    try {
      // Validate column structure
      const rowKeys = Object.keys(row);
      if (rowKeys.length !== expectedColumns.length) {
        throw new Error(`Invalid column count. Expected ${expectedColumns.length} columns, got ${rowKeys.length}`);
      }

      // Validate column order
      for (let i = 0; i < expectedColumns.length; i++) {
        if (rowKeys[i] !== expectedColumns[i]) {
          throw new Error(`Invalid column order. Expected "${expectedColumns[i]}" at position ${i + 1}, got "${rowKeys[i]}"`);
        }
      }

      // Validate mandatory fields (Block ID and Remarks are optional)
      if (!row['Date'] || !row['Project'] || !row['Bill No'] || !row['Description'] || !row['Quantity'] || !row['Unit'] || !row['Unit Price'] || !row['Total Amount']) {
        throw new Error('Missing required fields: Date, Project, Bill No, Description, Quantity, Unit, Unit Price, and Total Amount are mandatory');
      }

      // Validate project exists
      const project = projects.find(p => p.name === row['Project']);
      if (!project) {
        throw new Error(`Project "${row['Project']}" does not exist in the system`);
      }

      const billNo = row['Bill No'].trim();
      const projectId = project.id;
      const billCombination = `${projectId}|${billNo}`;

      // Check for duplicate within CSV
      if (seenBillCombinations.has(billCombination)) {
        throw new Error('This bill number already entered in this project.');
      }

      // Check for duplicate with existing bills
      const existingDuplicate = existingBills.find(
        b => b.projectId === projectId && b.billNumber === billNo
      );
      if (existingDuplicate) {
        throw new Error('This bill number already entered in this project.');
      }

      seenBillCombinations.add(billCombination);

      // Validate numeric fields
      const quantity = parseFloat(row['Quantity']);
      const unitPrice = parseFloat(row['Unit Price']);
      const totalAmount = parseFloat(row['Total Amount']);

      if (isNaN(quantity)) {
        throw new Error('Invalid Quantity: must be a number');
      }
      if (isNaN(unitPrice)) {
        throw new Error('Invalid Unit Price: must be a number');
      }
      if (isNaN(totalAmount)) {
        throw new Error('Invalid Total Amount: must be a number');
      }

      // Validate date format (basic check for dd-mm-yyyy)
      const datePattern = /^\d{2}-\d{2}-\d{4}$/;
      if (!datePattern.test(row['Date'])) {
        throw new Error('Invalid Date format: must be dd-mm-yyyy');
      }

      // Handle optional fields: Block ID and Remarks (allow empty/blank values)
      const blockId = row['Block ID']?.trim();
      const remarks = row['Remarks']?.trim();
      const description = row['Description']?.trim();
      const unit = row['Unit']?.trim();

      const bill: Bill = {
        projectId: projectId,
        blockId: blockId || undefined,
        billNumber: billNo,
        description: description || '',
        quantity: quantity,
        unit: unit || 'Sft',
        unitPrice: unitPrice,
        remarks: remarks || undefined,
        date: row['Date'],
        amount: totalAmount,
        includesGst: false,
      };

      valid.push(bill);
    } catch (error) {
      invalid.push({ row: index + 2, data: row, error: (error as Error).message });
    }
  });

  return { valid, invalid };
}

export function validatePaymentCSVData(data: any[], projects: Project[]): { valid: Payment[]; invalid: any[] } {
  const valid: Payment[] = [];
  const invalid: any[] = [];

  // Expected columns: Project, Date, Amount Paid, Payment Mode, Reference, Remarks
  const expectedColumns = ['Project', 'Date', 'Amount Paid', 'Payment Mode', 'Reference', 'Remarks'];

  data.forEach((row, index) => {
    try {
      // Validate column structure
      const rowKeys = Object.keys(row);
      if (rowKeys.length !== expectedColumns.length) {
        throw new Error(`Invalid column count. Expected ${expectedColumns.length} columns, got ${rowKeys.length}`);
      }

      // Validate column order
      for (let i = 0; i < expectedColumns.length; i++) {
        if (rowKeys[i] !== expectedColumns[i]) {
          throw new Error(`Invalid column order. Expected "${expectedColumns[i]}" at position ${i + 1}, got "${rowKeys[i]}"`);
        }
      }

      // Validate mandatory fields
      if (!row['Project'] || !row['Date'] || !row['Amount Paid'] || !row['Payment Mode']) {
        throw new Error('Missing required fields: Project, Date, Amount Paid, and Payment Mode are mandatory');
      }

      // Validate numeric field
      const amount = parseFloat(row['Amount Paid']);
      if (isNaN(amount)) {
        throw new Error('Invalid Amount Paid: must be a number');
      }

      // Validate payment mode
      const paymentMode = row['Payment Mode'].trim();
      if (paymentMode !== 'Account' && paymentMode !== 'Cash') {
        throw new Error('Invalid Payment Mode: must be "Account" or "Cash"');
      }

      // Validate project exists
      const project = projects.find(p => p.name === row['Project']);
      if (!project) {
        throw new Error(`Project "${row['Project']}" does not exist in the system`);
      }

      // Validate date format (basic check for dd-mm-yyyy)
      const datePattern = /^\d{2}-\d{2}-\d{4}$/;
      if (!datePattern.test(row['Date'])) {
        throw new Error('Invalid Date format: must be dd-mm-yyyy');
      }

      // Handle optional Remarks field
      const remarks = row['Remarks']?.trim();

      const payment: Payment = {
        id: `payment_${Date.now()}_${index}`,
        projectId: project.id,
        amount: amount,
        date: row['Date'],
        paymentMode: paymentMode === 'Account' ? PaymentMode.account : PaymentMode.cash,
        reference: row['Reference'] || '',
        remarks: remarks || undefined,
      };

      valid.push(payment);
    } catch (error) {
      invalid.push({ row: index + 2, data: row, error: (error as Error).message });
    }
  });

  return { valid, invalid };
}

// ============ PDF EXPORT UTILITIES (using print window) ============

export function exportBillsToPDF(bills: Bill[], projects: Project[], title: string = 'Bills Report') {
  const tableRows = bills.map(bill => {
    const project = projects.find(p => p.id === bill.projectId);
    return `
      <tr>
        <td>${bill.date}</td>
        <td>${project?.name || 'Unknown'}</td>
        <td>${bill.blockId || '–'}</td>
        <td>${bill.billNumber}</td>
        <td>${bill.description}</td>
        <td style="text-align: right;">${bill.quantity.toFixed(2)}</td>
        <td>${bill.unit}</td>
        <td style="text-align: right;">₹${bill.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${bill.remarks || '–'}</td>
      </tr>
    `;
  }).join('');

  const content = `
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
    <p>Total Bills: ${bills.length}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Project</th>
          <th>Block ID</th>
          <th>Bill No</th>
          <th>Description</th>
          <th style="text-align: right;">Quantity</th>
          <th>Unit</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total Amount</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  exportToPDF(content, 'bills_report');
}

export function exportPaymentsToPDF(payments: Payment[], projects: Project[], title: string = 'Payments Report') {
  const tableRows = payments.map(payment => {
    const project = projects.find(p => p.id === payment.projectId);
    return `
      <tr>
        <td>${payment.date}</td>
        <td>${project?.name || 'Unknown'}</td>
        <td style="text-align: right;">₹${payment.amount.toLocaleString('en-IN')}</td>
        <td style="text-align: center;">${payment.paymentMode === PaymentMode.account ? 'Account' : 'Cash'}</td>
        <td>${payment.reference || '–'}</td>
        <td>${payment.remarks || '–'}</td>
      </tr>
    `;
  }).join('');

  const content = `
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
    <p>Total Payments: ${payments.length}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Project</th>
          <th>Amount</th>
          <th>Payment Mode</th>
          <th>Reference</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  exportToPDF(content, 'payments_report');
}

// PDF export using print window
export function exportToPDF(content: string, filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body {
          font-family: 'Century Gothic', 'Gothic A1', Arial, sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #0078D7;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        h1 {
          color: #0078D7;
          border-bottom: 2px solid #0078D7;
          padding-bottom: 10px;
        }
        p {
          margin: 5px 0;
        }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      ${content}
      <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #0078D7; color: white; border: none; border-radius: 4px; cursor: pointer;">Print / Save as PDF</button>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ============ FORMAT DATA FOR EXPORT ============

export function formatProjectsForExport(projects: Project[]) {
  return projects.map(p => ({
    'Project Name': p.name,
    'Client': p.client,
    'Start Date': p.startDate,
    'Unit Price': p.unitPrice,
    'Quantity': p.quantity,
    'Estimated Amount': p.estimatedAmount,
    'Contact Number': p.contactNumber,
    'Location': p.location,
    'Address': p.address,
    'Notes': p.notes
  }));
}

export function formatBillsForExport(bills: Bill[], projects: Project[]) {
  return bills.map(b => {
    const project = projects.find(p => p.id === b.projectId);
    return {
      'Date': b.date,
      'Project': project?.name || 'Unknown',
      'Block ID': b.blockId || '',
      'Bill No': b.billNumber,
      'Description': b.description,
      'Quantity': b.quantity,
      'Unit': b.unit,
      'Unit Price': b.unitPrice,
      'Total Amount': b.amount,
      'Remarks': b.remarks || ''
    };
  });
}

export function formatPaymentsForExport(payments: Payment[], projects: Project[]) {
  return payments.map(p => {
    const project = projects.find(pr => pr.id === p.projectId);
    return {
      'Date': p.date,
      'Project': project?.name || 'Unknown',
      'Amount': p.amount,
      'Payment Mode': p.paymentMode === PaymentMode.account ? 'Account' : 'Cash',
      'Reference': p.reference || '',
      'Remarks': p.remarks || ''
    };
  });
}

