import {
  type Bill,
  Client,
  type Payment,
  PaymentMode,
  type Project,
  UserProfile,
} from "../backend";

// CSV Export
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// PDF Export using window.print()
export function exportToPDF(title: string) {
  document.title = title;
  window.print();
}

// Parse CSV
export function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

// Format Bills for Export
export function formatBillsForExport(bills: Bill[], projects: Project[]) {
  return bills.map((bill) => {
    const project = projects.find((p) => p.id === bill.projectId);
    return {
      Date: bill.date,
      Project: project?.name || "Unknown",
      "Block ID": bill.blockId || "",
      "Bill No": bill.billNumber,
      Description: bill.description,
      Quantity: bill.quantity.toFixed(2),
      Unit: bill.unit,
      "Unit Price": bill.unitPrice.toFixed(2),
      "Total Amount": bill.amount.toFixed(2),
      Remarks: bill.remarks || "",
    };
  });
}

// Format Payments for Export
export function formatPaymentsForExport(
  payments: Payment[],
  projects: Project[],
) {
  return payments.map((payment) => {
    const project = projects.find((p) => p.id === payment.projectId);
    return {
      Project: project?.name || "Unknown",
      Date: payment.date,
      "Amount Paid": payment.amount.toFixed(0),
      "Payment Mode":
        payment.paymentMode === PaymentMode.account ? "Account" : "Cash",
      Reference: payment.reference,
      Remarks: payment.remarks || "",
    };
  });
}

// Format Projects for Export
export function formatProjectsForExport(projects: Project[]) {
  return projects.map((project) => ({
    "Project Name": project.name,
    Client: project.client,
    "Start Date": project.startDate,
    "End Date": project.endDate,
    "Unit Price": project.unitPrice.toFixed(2),
    Quantity: project.quantity.toFixed(2),
    "Estimated Amount": project.estimatedAmount.toFixed(2),
    "Contact Number": project.contactNumber,
    Location: project.location,
    Notes: project.notes,
    Address: project.address,
    "Attachment Link 1": project.attachmentLinks[0] || "",
    "Attachment Link 2": project.attachmentLinks[1] || "",
  }));
}

// Download Templates
export function downloadBillsTemplate() {
  const template = [
    [
      "Date",
      "Project",
      "Block ID",
      "Bill No",
      "Description",
      "Quantity",
      "Unit",
      "Unit Price",
      "Total Amount",
      "Remarks",
    ],
    [
      "01-01-2026",
      "Sample Project",
      "Block A",
      "1001",
      "Construction",
      "100",
      "Sft",
      "500",
      "50000",
      "First floor work",
    ],
  ];
  const csvContent = template.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "bills_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadPaymentsTemplate() {
  const template = [
    ["Project", "Date", "Amount Paid", "Payment Mode", "Reference", "Remarks"],
    [
      "Sample Project",
      "31-12-2025",
      "10000",
      "Account",
      "Harsha",
      "Payment for first phase",
    ],
  ];
  const csvContent = template.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "payments_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadProjectsTemplate() {
  const template = [
    [
      "Project Name",
      "Client",
      "Start Date",
      "End Date",
      "Unit Price",
      "Quantity",
      "Estimated Amount",
      "Contact Number",
      "Location",
      "Notes",
      "Address",
      "Attachment Link 1",
      "Attachment Link 2",
    ],
    [
      "Sample Project",
      "Sample Client",
      "01-01-2026",
      "31-12-2026",
      "500",
      "100",
      "50000",
      "+91 9876543210",
      "Mumbai, Maharashtra",
      "Sample notes",
      "Sample address",
      "",
      "",
    ],
  ];
  const csvContent = template.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "projects_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Validate CSV Data
export function validateBillCSVData(
  data: any[],
  projects: Project[],
  existingBills: Bill[],
) {
  const valid: Bill[] = [];
  const invalid: { row: number; error: string }[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we skip header

    // Check required fields
    if (
      !row.Date ||
      !row.Project ||
      !row["Bill No"] ||
      !row.Description ||
      !row.Quantity ||
      !row.Unit ||
      !row["Unit Price"] ||
      !row["Total Amount"]
    ) {
      invalid.push({ row: rowNumber, error: "Missing required fields" });
      return;
    }

    // Find project
    const project = projects.find((p) => p.name === row.Project);
    if (!project) {
      invalid.push({
        row: rowNumber,
        error: `Project "${row.Project}" not found`,
      });
      return;
    }

    // Check for duplicate Project + Bill No combination
    const isDuplicate = existingBills.some(
      (bill) =>
        bill.projectId === project.id && bill.billNumber === row["Bill No"],
    );
    if (isDuplicate) {
      invalid.push({
        row: rowNumber,
        error: "This bill number already entered in this project.",
      });
      return;
    }

    // Validate numeric fields
    const quantity = Number.parseFloat(row.Quantity);
    const unitPrice = Number.parseFloat(row["Unit Price"]);
    const totalAmount = Number.parseFloat(row["Total Amount"]);

    if (
      Number.isNaN(quantity) ||
      Number.isNaN(unitPrice) ||
      Number.isNaN(totalAmount)
    ) {
      invalid.push({ row: rowNumber, error: "Invalid numeric values" });
      return;
    }

    // Create bill object
    const bill: Bill = {
      projectId: project.id,
      blockId: row["Block ID"] || undefined,
      billNumber: row["Bill No"],
      description: row.Description,
      quantity,
      unit: row.Unit,
      unitPrice,
      remarks: row.Remarks || undefined,
      date: row.Date,
      amount: totalAmount,
      includesGst: false,
    };

    valid.push(bill);
  });

  return { valid, invalid };
}

export function validatePaymentCSVData(data: any[], projects: Project[]) {
  const valid: Payment[] = [];
  const invalid: { row: number; error: string }[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;

    // Check required fields
    if (
      !row.Project ||
      !row.Date ||
      !row["Amount Paid"] ||
      !row["Payment Mode"] ||
      !row.Reference
    ) {
      invalid.push({ row: rowNumber, error: "Missing required fields" });
      return;
    }

    // Find project
    const project = projects.find((p) => p.name === row.Project);
    if (!project) {
      invalid.push({
        row: rowNumber,
        error: `Project "${row.Project}" not found`,
      });
      return;
    }

    // Validate payment mode
    const paymentModeStr = row["Payment Mode"].toLowerCase();
    if (paymentModeStr !== "account" && paymentModeStr !== "cash") {
      invalid.push({
        row: rowNumber,
        error: 'Payment Mode must be "Account" or "Cash"',
      });
      return;
    }

    // Validate amount
    const amount = Number.parseFloat(row["Amount Paid"]);
    if (Number.isNaN(amount)) {
      invalid.push({ row: rowNumber, error: "Invalid amount" });
      return;
    }

    // Map string to PaymentMode enum
    const paymentMode =
      paymentModeStr === "account" ? PaymentMode.account : PaymentMode.cash;

    // Create payment object
    const payment: Payment = {
      id: `payment_${Date.now()}_${Math.random()}`,
      projectId: project.id,
      amount,
      date: row.Date,
      paymentMode,
      reference: row.Reference,
      remarks: row.Remarks || undefined,
    };

    valid.push(payment);
  });

  return { valid, invalid };
}

// PDF Export for Bills using window.print()
export function exportBillsToPDF(
  _bills: Bill[],
  _projects: Project[],
  title: string,
) {
  document.title = title;
  window.print();
}

// PDF Export for Payments using window.print()
export function exportPaymentsToPDF(
  _payments: Payment[],
  _projects: Project[],
  title: string,
) {
  document.title = title;
  window.print();
}

// Export individual bill details as PDF using window.print()
export function exportBillDetailsToPDF(bill: Bill, project: Project) {
  document.title = `Bill_${bill.billNumber}_${project.name}`;
  window.print();
}

// Export individual payment details as PDF using window.print()
export function exportPaymentDetailsToPDF(payment: Payment, project: Project) {
  document.title = `Payment_${payment.id}_${project.name}`;
  window.print();
}
