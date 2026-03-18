# ClearPay – Contractors Module

## Current State
The app has a Clients module (ClientsPage.tsx) accessible via Alt+C. Dashboard, Analytics, Reports, and Seri AI only use Projects/Bills/Payments data.

## Requested Changes (Diff)

### Add
- Contractors Module replacing Clients module (same sidebar slot, same Alt+C shortcut)
- Backend: Contractor, ContractorBill, ContractorPayment types and CRUD functions
- Frontend: ContractorsPage.tsx with 4 tabs: Contractors | Bills | Payments | Reports
- Contractors tab: list with view/edit/delete/multi-select/bulk delete, ribbon with Print/PDF/Import CSV/Export CSV/Download Format/New Contractor
- Contractor Form fields: Name, Trade (multi: NMR, Form work, Bar bending, Scaffolding, Buffing, Mason), Project (dropdown from projects list), Date (calendar), Contracting Price, Unit (Rft/Sft/Cft/Rmtr/Smtr/Cumtr/Lumsum), Contact 1, Contact 2, Email, Address, Link 1, Link 2, Note
- Bills tab: list with view/edit/delete/multi-select/bulk delete, ribbon with Print/PDF/Import CSV/Export CSV/Download Format/New Bill
- Contractor Bill Form: Contractor Name (dropdown), Project Name (dropdown), Bill No (unique per project), Date, Item, Area, Unit, Unit Price, Amount (Area*Unit Price auto-calculated in INR), Remarks
- Payments tab: list with view/edit/delete/multi-select/bulk delete, ribbon with Print/PDF/Import CSV/Export CSV/Download Format/New Payment
- Contractor Payment Form: Contractor Name (dropdown), Project Name (dropdown), Payment No, Date, Amount, Payment Mode (Account/Cash), Remarks
- Reports (Ledger) tab: contractor ledger with filters (Contractor, Project, Date From, Date To), Print/PDF/Export CSV

### Modify
- MainLayout.tsx: replace "Clients" with "Contractors" (same position, same Alt+C shortcut)

### Remove
- ClientsPage.tsx usage (replaced by ContractorsPage.tsx)

## Implementation Plan
1. Add Contractor, ContractorBill, ContractorPayment types + stable storage + CRUD backend functions
2. Create ContractorsPage.tsx with 4 tabs, all ribbon actions, forms, filters, ledger
3. Update MainLayout.tsx to import/use ContractorsPage instead of ClientsPage
4. Contractors data must NOT appear in Dashboard, Analytics, Reports (main), or Seri AI
