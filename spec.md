# PayGo (MPH) — Projects, Contractors, and Bills Enhancements

## Current State

The PayGo module exists with three key pages:
- `PayGoProjectsPage.tsx`: Filter bar currently shown by default (`showFilters = true`). No View action in the list. +New form includes a Unit Price field.
- `PayGoContractorsPage.tsx`: Minimal toolbar (only New + Export CSV). No filter bar. Form uses dropdown-only Trade (no Sub-Trade, no attachment links). List has no View action and no Trade/Sub-Trade columns.
- `PayGoBillsPage.tsx`: Filter bar shown by default. Bills list columns are limited (no SI No, Sub Trade, Qty, No's, Gross Amount, Debits, WR %, Retention Amount, Net Amount, Workflow columns). +New Bill form has helper texts, auto-fill Engineer field, no Sub-Trade, no Calculation Summary box. Debit validation is not enforced. Work Retention/Year/Financial Year visible to all roles.
- `PayGoContext.tsx`: PayGoContractor type has no `subTrade`, `attachmentLink1`, `attachmentLink2` fields. PayGoBill type has no `subTrade` field.

## Requested Changes (Diff)

### Add
- **Projects**: View action column with receipt modal; receipt has Share, Print, Close icons in top-right (all functional)
- **Contractors**: Full toolbar (Print, Export PDF, Import CSV, Export CSV, Download Format, +New Contractor)
- **Contractors**: Collapsible filter bar (hidden by default) with: Contractor Name, Trade, Project, From Date, To Date, Year, Min Unit Price, Max Unit Price
- **Contractors**: Sub-Trade field in +New form (free text, manual entry)
- **Contractors**: Attachment Link 1 and Attachment Link 2 fields in +New form
- **Contractors**: Trade column and Sub-Trade column in the list
- **Contractors**: View action in the list with receipt modal; Share, Print, Close icons in top-right
- **Contractors**: `subTrade`, `attachmentLink1`, `attachmentLink2` fields in PayGoContractor type in context
- **Bills**: SI No column (row number)
- **Bills**: Sub Trade column
- **Bills**: Qty and No's columns
- **Bills**: Gross Amount column (auto-calc: UnitPrice × Qty × No's)
- **Bills**: Debits column (combined: Engineer Debit + PM Debit + QC Debit from workflow history)
- **Bills**: Work Retention % column
- **Bills**: Retention Amount column (calc: (Gross − Debit) / 100 × WR%)
- **Bills**: Net Amount column (calc: Gross − Debit − Retention)
- **Bills**: Workflow column showing current workflow stage with icon (PM / QC / BE / ✔ / ✗)
- **Bills**: `subTrade` field in PayGoBill type and form
- **Bills**: Sub-Trade field in +New Bill form (adjacent to Trade, dynamically filtered)
- **Bills**: Calculation Summary box in form showing: Gross Amount, Effective Debit, Net Amount
- **Bills**: Attachment 1 and Attachment 2 fields in +New Bill form (already in model, ensure in form UI)
- **Bills**: Remarks field in form (already in model, ensure in form UI)
- **Bills**: Debit rule: first 20 chars must be alphanumeric only; special chars only allowed after char 20; debit only applies if reason length > 20 valid chars
- **Bills**: View action opens full details modal including remarks, reasons, and all workflow history
- **Bills**: Workflow column action indicator: after SE creates → shows "PM"; after PM approves → "QC"; after QC approves → "BE"; after BE approves → ✔; if rejected → ✗

### Modify
- **Projects**: Filter bar hidden by default (`showFilters = false` initial state)
- **Projects**: +New form — remove Unit Price field
- **Contractors**: Trade field in +New form changed from dropdown to free-text input
- **Bills**: Filter bar hidden by default
- **Bills**: Remove all helper/placeholder texts: "Auto Generated" near Bill No, "Bill Generated" text, bill number preview below field, "Filter by Contractor" in Trade placeholder, "Auto" near Gross Amount
- **Bills**: Engineer field changed from auto-fill to manual text input
- **Bills**: Remove Work Retention, Year, Financial Year fields from +New Bill form UI (keep in data model for backward compat)
- **Bills**: Work Retention % and Retention Amount fields only shown to Billing Engineer role
- **Bills**: Debit calculation only applies when Reason for Debit has >20 valid characters
- **Bills**: View receipt for projects/contractors shows full data (all fields)

### Remove
- **Projects**: Unit Price field from +New Project form
- **Bills**: Helper texts ("Auto Generated", "Bill Generated", bill number preview, "Filter by Contractor", "Auto" label)
- **Bills**: Work Retention, Year, Financial Year fields from the +New Bill form UI
- **Bills**: Auto-fill logic for Engineer field (replace with manual input)

## Implementation Plan

1. **Update PayGoContext.tsx** — Add `subTrade`, `attachmentLink1`, `attachmentLink2` to `PayGoContractor` type. Add `subTrade` to `PayGoBill` type.

2. **Update PayGoProjectsPage.tsx**:
   - Change `showFilters` initial state to `false`
   - Remove Unit Price field from the +New/Edit form
   - Add a View action button per row
   - Build a View Receipt modal with: all project fields displayed, Share (download PNG), Print (window.print), Close icons in the top-right corner

3. **Update PayGoContractorsPage.tsx** (full rebuild):
   - Add full toolbar: Print, Export PDF, Import CSV, Export CSV, Download Format, +New Contractor
   - Add collapsible filter bar hidden by default with: Contractor Name, Trade, Project, From Date, To Date, Year, Min Unit Price, Max Unit Price
   - Change Trade field in form to free-text Input
   - Add Sub-Trade free-text Input in form
   - Add Attachment Link 1 and Link 2 URL inputs in form
   - Add Trade and Sub-Trade columns to the list table
   - Add View action button per row
   - Build View Receipt modal with Share, Print, Close icons in top-right

4. **Update PayGoBillsPage.tsx** (BillsTab component):
   - Change filter bar initial state to hidden
   - Update bills list columns: SI No, Bill No, Project, Trade, Sub Trade, Block ID, Date, Description of Item, Unit, Unit Price, Qty, No's, Gross Amount, Debits, WR %, Retention Amount, Net Amount, Workflow, Actions
   - Gross Amount = UnitPrice × Qty × No's (display computed)
   - Debits = sum of all debit amounts from workflowHistory
   - Retention Amount = (Gross − Debits) / 100 × WR%
   - Net Amount = Gross − Debits − Retention Amount
   - Workflow column: show PM/QC/BE text badge or ✔/✗ icon
   - Remove all helper texts from +New Bill form
   - Change Engineer field to manual text Input
   - Add Sub-Trade input field next to Trade
   - Remove Work Retention, Year, Financial Year from form UI
   - Add Calculation Summary box below form fields showing Gross Amount, Effective Debit, Net Amount
   - WR% and Retention Amount fields in form only visible when currentRole === 'Billing Engineer'
   - Enforce Reason for Debit validation: alphanumeric only for first 20 chars, special chars allowed after char 20; debit only applies if reason length > 20 chars
   - View action opens a detailed receipt modal showing all fields including remarks and reasons and workflow history
   - Ensure Attachment 1, Attachment 2, Remarks are visible in the form
   - After SE/Admin creates bill, workflow status set to "Pending PM Review" and action column shows "PM"
