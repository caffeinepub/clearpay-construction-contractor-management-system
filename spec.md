# ClearPay

## Current State
ContractorsPage has Bills Format download missing Gross Amount column and using old "Amount (INR)" name. Import CSV for Contractors/Bills/Payments silently fails (wrong argument counts, mismatched header names, no feedback). receiptShare.ts has a maxRows cap that truncates data. Sidebar tagline wraps to two lines and copyright wraps.

## Requested Changes (Diff)

### Add
- "Gross Amount" column header in Bills Format download (after Unit Price)
- Toast notifications for import CSV success/errors
- Dynamic canvas height in receiptShare.ts so all rows render

### Modify
- Bills Format: rename "Amount (INR)" → "Net Amount"; add "Gross Amount" after "Unit Price"
- Bills Import CSV: fix format headers to match import field names (ContractorId, ProjectId, BillNo, BlockId, Date, Item, Area, Unit, UnitPrice, WRPercent, Remarks); pass all 12 args to addContractorBill
- Contractors Import CSV: add WoNo to format headers and pass as 14th arg to addContractor
- Payments Import CSV: format already mostly correct, add error toast, ensure paymentNo is handled
- receiptShare.ts: compute canvas height dynamically from row count (no maxRows truncation)
- Sidebar "Billing Management System": single bold line, font-size ~9px, nowrap
- Sidebar "© 2025 ClearPay. Powered by Seri AI.": single line, font-size ~9px, nowrap
- Sidebar "ClearPay" text: bold, same existing blue/grey colors

### Remove
- Fixed maxRows limit in receiptShare.ts

## Implementation Plan
1. ContractorsPage.tsx: fix Bills format headers (add Gross Amount, rename Amount→Net Amount), fix all three importCSV call sites with correct field names and arg counts, add toast for import success/error
2. receiptShare.ts: remove maxRows cap, compute canvas H dynamically based on number of rows
3. MainLayout.tsx: fix sidebar tagline and copyright to single lines with smaller font, ensure ClearPay is bold
