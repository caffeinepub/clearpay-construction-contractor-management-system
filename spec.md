# PayGo (MPH) — Bills/Projects/Contractors/Payments RBAC + BOQ + Work Order Modules

## Current State

PayGo (MPH) mode exists as a switchable mode in the BMS app with isolated data. It has:
- Dashboard, Analytics, Projects, Contractors, Bills (with NMR), Payments, Reports, Users, AI Chatbot modules
- Bills page: filter bar visible by default, only total bills summary card (not 4 summary boxes), edit/delete visible to all roles
- Projects/Contractors: toolbar buttons (Import, Export, +New) visible to all roles; no role-based hiding
- Payments: no filter bar, no Print/Export buttons visible to all roles, Pay/Edit visible to all roles
- Role switcher exists: Admin, Site Engineer, PM, QC, Billing Engineer
- Workflow debit tracking: only shows total debit in aggregate; PM debit not separately visible
- Work Retention %/Retention Amount: shown in form for all roles
- No BOQ module
- No Work Order module

## Requested Changes (Diff)

### Add
- **Bills summary boxes**: 4 boxes at top of Bills page — Gross Total, Debit Total, Retention Total, Net Total — dynamically aggregated from filtered bills list
- **Bills filter bar toggle**: filter bar hidden by default, toggled by button
- **Cumulative debit transparency**: Bill view must show Engineer Debit, PM Debit, QC Debit separately plus total — visible to PM+ roles
- **BOQ Module**: New page `PayGoBOQPage.tsx` with hierarchical categories (Earthwork, RCC, Masonry, Finishing, Electrical, Plumbing), sub-categories, items with description/unit/L/W/H dimensions/qty(auto)/rate/amount; real-time summary panel; inline editing; collapsible sections; Print/Preview
- **Work Order Module**: New page `PayGoWorkOrderPage.tsx` — select project/contractor/BOQ items, define scope, quantities, rates; work order date/start/end dates/payment terms/retention%/notes; auto-calc total; Edit/Duplicate; version tracking; status (Draft/Issued/In Progress/Completed); Print/Preview with professional layout
- **BOQ and Work Order data types** in `PayGoContext.tsx`
- **BOQ and Work Order nav items** in `MainLayout.tsx`

### Modify
- **Bills Page (BillsTab)**: 
  - Add 4 summary boxes (Gross Total, Debit Total, Retention Total, Net Total) at top
  - Filter bar hidden by default (showFilters starts as false — already done, keep)
  - Role-based access: Edit, Delete, +New Bill, Import CSV, Export CSV, Download Format hidden for non-Admin roles; only View action visible to PM/QC/Billing Engineer/Site Engineer/User
  - Billing Engineer only: WR% field and Retention Amount visible only when role === 'Billing Engineer'
  - Retention % and Amount show as 0 in list until Billing Engineer enters values
  - Net Amount = Gross - Debit - Retention (Billing Engineer stage onward)
  - Bill view: show breakdown of Engineer Debit + PM Debit + QC Debit + Total Debit clearly
- **Projects Page**: 
  - Role-based access: Print, Export PDF, Import CSV, Export CSV, Download Format, +New Project hidden for non-Admin roles
  - Only View action visible in table for non-Admin roles (Edit/Delete hidden)
- **Contractors Page**: 
  - Role-based access: same as Projects — all toolbar actions except View hidden for non-Admin
  - Only View action in table for non-Admin roles
- **Payments Page**: 
  - Add filter bar (hidden by default) with Project, Contractor, Payment Status filters
  - Add Print, Export PDF, Export CSV buttons visible to ALL roles
  - Pay and Edit actions visible only to Admin and Billing Engineer
  - Delete visible only to Admin
- **PayGoContext**: Add BOQ and WorkOrder data types, storage, CRUD methods
- **MainLayout**: Add pg-boq and pg-workorder to PayGoPage type and nav items; route to new pages

### Remove
- None

## Implementation Plan

1. **Update PayGoContext.tsx**: Add `PayGoBOQCategory`, `PayGoBOQItem`, `PayGoWorkOrder` types; add state, load/save, CRUD functions for BOQ and Work Orders
2. **Update PayGoBillsPage.tsx**: 
   - Add 4 summary boxes (Gross Total, Debit Total, Retention Total, Net Total) computed from filtered bills
   - Hide Edit/Delete/+New/Import/Export toolbar buttons for non-Admin roles
   - Show only View in actions column for non-Admin
   - WR% visible only when role === 'Billing Engineer'
   - Bill view modal: show per-role debit breakdown
3. **Update PayGoProjectsPage.tsx**: Hide all toolbar actions (Print/Export/Import/+New) for non-Admin; hide Edit/Delete in table
4. **Update PayGoContractorsPage.tsx**: Same RBAC as Projects
5. **Update PayGoPaymentsPage.tsx**: Add hidden-by-default filter bar (Project, Contractor, Payment Status); add Print/Export PDF/Export CSV visible to all; Pay/Edit only for Admin+Billing Engineer; Delete only Admin
6. **Create PayGoBOQPage.tsx**: Full BOQ module with hierarchical accordion, inline editing, real-time totals, summary panel, print
7. **Create PayGoWorkOrderPage.tsx**: Work order management with BOQ item selection, status system, print
8. **Update MainLayout.tsx**: Add BOQ and Work Order page types and nav items; route to new pages
