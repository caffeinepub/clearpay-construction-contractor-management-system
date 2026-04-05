# BMS – PayGo New Bill Form with Workflow & Payments Flow

## Current State

The PayGo (MPH) Bills page (`PayGoBillsPage.tsx`) has a basic New Bill form with fields: Project, Contractor, Trade, Block ID, Date, Amount, Year, Financial Year, Status, Remarks. The `PayGoBill` type in `PayGoContext.tsx` only stores: id, billNo, project, contractor, trade, blockId, date, amount, status (Pending/Approved/Paid/Rejected), remarks, year, financialYear.

There is no:
- Auto-generated bill number based on project prefix
- Dynamic contractor-to-trade linkage
- Unit Price auto-populate from contractor rates
- Auto-calculated Gross Amount, Retention Amount, Net Amount
- Conditional Debit logic with reason validation
- Multi-step approval workflow (PM → QC → Billing Engineer)
- Payment flow showing approved bills with Pending/Partially Paid/Completed status

The PayGoContractor type stores: id, name, trade (single string), project, contractingPrice, unit, contact, email, address, notes, status.

The PayGoPayment type stores: id, paymentNo, project, date, amount, paymentMode, reference, remarks, status.

## Requested Changes (Diff)

### Add
- **New fields to `PayGoBill` type:** description, unit, unitPrice, qty, nos, grossAmount, debitAmount, reasonForDebit, workRetention (%), retentionAmount, netAmount, attachment1, attachment2, engineerName, workflowStatus, workflowHistory (array of step objects), paidAmount, remainingAmount
- **Bill Number auto-generation:** Based on first 2 letters of project name in uppercase + 3-digit sequence (e.g., Parkville → PA001). Must check existing bills for the same project and assign next number.
- **Dynamic Contractor → Trade linkage:** After selecting Contractor, Trade dropdown filters to show only trades mapped to that contractor (from PayGoContractor records for the selected project)
- **Unit Price auto-populate:** Pulls from `contractingPrice` of the matched contractor record for that project+trade combo
- **Real-time calculations:**
  - Gross Amount = Unit Price × Qty × No's
  - Debit Amount only applies if Reason for Debit is non-empty
  - Retention Amount = (Gross Amount − Debit Amount) / 100 × Work Retention %
  - Net Amount = Gross Amount − Debit Amount + Retention Amount
- **Approval Workflow:**
  - After save: bill status = "Pending PM Review"
  - PM actions: Add Debit (with reason), Approve (moves to QC), Reject (remarks mandatory)
  - QC actions: Add Debit (with reason), Approve (moves to Billing Engineer), Reject
  - Billing Engineer: Approve → bill becomes "Billing Approved" and appears in Payments
- **workflowStatus values:** "Pending PM Review", "PM Approved", "QC Approved", "Billing Approved", "Rejected"
- **Payments integration:** Bills with workflowStatus = "Billing Approved" automatically appear in PayGoPaymentsPage as payment entries with status = "Pending"
- **Pay button in Payments:** Opens a Pay dialog. Full payment → status = "Completed". Partial → status = "Partially Paid", track remaining balance.
- **Role simulation:** Since we don't have a real role system in PayGo, simulate with a role selector in the header area of PayGo OR use a simple role context. The Bills list shows different action buttons based on current role (Admin/Site Engineer → create; PM/QC/Billing Engineer → approve/reject buttons in view).
- **Engineer Name auto-fill:** Use logged-in user's name or a stored PayGo user role name

### Modify
- `PayGoBill` type: extend with all new fields above
- `PayGoContext`: update addBill logic for project-prefix bill numbering; add updateBillWorkflow action; extend payments to support partial pay with paidAmount/remainingAmount tracking
- `PayGoBillsPage.tsx`: completely replace the New Bill form dialog with the comprehensive form (all new fields, real-time calculations, dynamic dropdowns). Add workflow action buttons (Approve/Reject/Add Debit) in the View dialog based on current workflow step. Bills list shows workflow status column.
- `PayGoPaymentsPage.tsx`: Show bills with workflowStatus = "Billing Approved" in the payments list. Add a "Pay" button that opens a Pay dialog. Track paidAmount, remainingAmount, update status to Partially Paid or Completed.

### Remove
- The simple "Amount" field from the bill form (replaced by Gross Amount, Debit Amount, Net Amount calculations)
- Manual Status selector in New Bill form (status is driven by workflow now)

## Implementation Plan

1. **Update `PayGoContext.tsx`:**
   - Extend `PayGoBill` type with all new fields
   - Update `addBill` to auto-generate project-prefix bill numbers
   - Add `updateBillWorkflow(id, step, action, remarks, debitAmount?, reasonForDebit?)` action
   - Extend `PayGoPayment` type with `billId`, `paidAmount`, `remainingAmount`
   - Add `payBill(billId, payAmount)` action that creates/updates the payment record

2. **Update `PayGoBillsPage.tsx`:**
   - Replace the small 2-col form with a full-width comprehensive form dialog
   - Form fields: Project (dropdown → triggers bill no generation), Bill No (read-only auto), Date, Contractor (dropdown → filters trade), Trade (filtered dropdown), Block ID, Description of Work, Unit, Unit Price (auto from contractor rate, editable), Qty, No's, Gross Amount (read-only calc), Debit Amount, Reason for Debit (textarea), Work Retention %, Retention Amount (read-only calc), Net Amount (read-only calc), Remarks, Attachment 1 (URL input), Attachment 2 (URL input), Engineer Name (auto-filled)
   - Bills list table: add columns for Gross Amount, Net Amount, Workflow Status
   - View dialog: show full bill details + workflow history + action buttons based on workflowStatus (Approve, Reject, Add Debit)
   - Role simulation: show a small "Current Role" selector at the top of the page (Admin, Site Engineer, PM, QC, Billing Engineer)

3. **Update `PayGoPaymentsPage.tsx`:**
   - Query bills with workflowStatus = "Billing Approved" and add them to the payments list automatically
   - Show status as Pending/Partially Paid/Completed
   - Add "Pay" button that opens a Pay dialog with amount input
   - Track paidAmount and remainingAmount
   - Update bill status to Completed or Partially Paid based on payment
