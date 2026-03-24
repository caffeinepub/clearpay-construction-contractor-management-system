# ClearPay – Contractors Module Updates

## Current State
ContractorsPage.tsx has:
- Dates displayed raw (YYYY-MM-DD) in all lists
- Bills list has no Gross Amount column; Amount (INR) not renamed to Net Amount (INR)
- Bills CSV download format missing BlockId, WR%, WR Amount, Gross Amount columns
- Reports summary boxes use Net Amount for Bills total, not Gross Amount
- Outstanding = Bills - Payments (should be Gross - (WR + Payments))
- View modals (Contractor, Bill, Payment) have no print icon
- No A5 receipt print functionality

## Requested Changes (Diff)

### Add
- Gross Amount column in Bills list (after Unit Price): value = Area × Unit Price
- grossAmount field to ContractorBillRecord type and bill form state
- Print icon button in top-right of all 3 view modals (Contractor, Bill, Payment)
- A5-formatted print receipt window triggered by print icon

### Modify
- All date displays in Contractors/Bills/Payments lists and Reports ledger: format YYYY-MM-DD → DD-MM-YYYY
- Bills list column "Amount (INR)" → renamed to "Net Amount (INR)"
- Bills CSV download format template: add Contractor, Project, Bill No, Block ID, Date, Item, Area, Unit, Unit Price, WR %, WR Amount ₹, Amount (INR), Remarks as columns
- Bills export CSV: include blockId, workRetention, workRetentionAmount, grossAmount
- Reports summary boxes:
  - Box 1: Bills = sum of grossAmount (Area × Unit Price)
  - Box 2: Work Retention = sum of workRetentionAmount
  - Box 3: Payments = sum of payments
  - Box 4: Outstanding = Gross Amount − (Work Retention + Payments)
- When saving a bill: also calculate and store grossAmount = area × unitPrice

### Remove
- Nothing

## Implementation Plan
1. Add helper function formatDateDDMMYYYY(dateStr) in ContractorsPage or utils
2. Apply date formatter to all {c.date}, {b.date}, {p.date}, {e.date} in list tables
3. Add grossAmount to ContractorBillRecord type interface
4. Add grossAmount to bill form state and auto-calculate on area/unitPrice change
5. Pass grossAmount when calling addContractorBill/updateContractorBill
6. Add Gross Amount column in Bills list table (after Unit Price)
7. Rename Amount (INR) header to Net Amount (INR)
8. Update Download Format CSV template to include all required columns
9. Update Export CSV to include all fields
10. Fix Reports summary calculations to use grossAmount for Bills box
11. Fix Outstanding formula to Gross - (WorkRetention + Payments)
12. Add print icon button to each view modal
13. Add printReceipt() function that opens an A5 window with styled receipt and auto-triggers print dialog
