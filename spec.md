# ClearPay – SFT & Contractor Module Fixes + Receipt Enhancements

## Current State
- SFT Module: toolbar shows "SFT Module" text left of Print button; `addSftEntry` fails because SFT functions are missing from `backend.did.js` IDL declarations
- Projects/Bills/Payments view modals: have Print icon only, no Share icon
- Contractors Module view receipts: have Print icon only, no Share icon
- Contractors Module: checkboxes visible to all users (should be hidden for Users)
- Contractors Module: Print/PDF/Export CSV not explicitly confirmed visible to Users
- Contractors Bills page: no Total SFT summary box; Total Bills box has no bill count
- Contractors Payments page: Total Payments box has no payment count
- Contractors list table: shows `{c.date}` raw (YYYY-MM-DD), not formatted

## Requested Changes (Diff)

### Add
- `addSftEntry`, `updateSftEntry`, `deleteSftEntries`, `listSftEntries` to `backend.did.js` IDL
- Share icon (Share2 from lucide-react) next to Print icon in top-right of all view receipts:
  - Projects view modal
  - Bills view modal
  - Payments view modal
  - Contractors: Contractor view, Bill view, Payment view
  - SFT view receipt
- Total SFT summary box in Contractors Bills tab (left side of Total Bills box), showing sum of `area` column from filtered bills list
- Bill count at bottom of Total Bills summary box in Contractors Bills tab
- Payment count at bottom of Total Payments summary box in Contractors Payments tab

### Modify
- SFT Page toolbar: remove "SFT Module" span/text that appears left of the Print button
- Contractors list table: change `{c.date}` to `{fmtDate(c.date)}` so date displays as DD-MM-YYYY
- Role-based visibility in Contractors tab (Contractors/Bills/Payments): checkboxes (row select) hidden for Users; Print, PDF, Export CSV buttons visible to ALL users (not just canManage)

### Remove
- Nothing

## Implementation Plan

1. **`backend.did.js`**: Add SFT IDL entries at end of IDL factory (before closing `});`):
   - `addSftEntry`: takes (Text x11, Float64 x6) -> [Text]
   - `updateSftEntry`: takes (Text id, ..., Text password) -> []
   - `deleteSftEntries`: takes ([Text], Text) -> []
   - `listSftEntries`: returns [Vec(Record({id,contractorId,projectId,billNo,slabNo,footings,rw,columns,beams,slab,oht,totalSft,remarks}))]

2. **`SFTPage.tsx`**: Remove the `<span>SFT Module</span>` element from the toolbar. It appears around line 495.

3. **`ProjectsPage.tsx`**: In the view modal header, add Share2 button next to Printer button. Share uses `navigator.share` (if supported) or copies a summary to clipboard.

4. **`BillsPage.tsx`**: Same — add Share2 button next to Print in the bill view modal.

5. **`PaymentsPage.tsx`**: Same — add Share2 button in payment view modal.

6. **`ContractorsPage.tsx`**:
   - In Contractor view dialog header: add Share2 next to Printer
   - In Bill view dialog header: add Share2 next to Printer
   - In Payment view dialog header: add Share2 next to Printer
   - Contractors list date: change `{c.date}` to `{fmtDate(c.date)}`
   - Role-based checkbox: wrap all row-select checkboxes with `{canManage && ...}` in Contractors/Bills/Payments tab tables
   - Print, PDF, Export CSV buttons: ensure they are NOT wrapped in `{canManage && ...}` — move them outside that gate so Users can also see them
   - Total SFT box: add before the Total Bills div in the Bills toolbar; value = `filteredBills.reduce((s,b) => s + (b.area || 0), 0)` formatted with 2 decimal places
   - Bill count: add `<div style={{fontSize:'11px', marginTop:'2px'}}>{filteredBills.length} bills</div>` inside Total Bills div
   - Payment count: add `<div style={{fontSize:'11px', marginTop:'2px'}}>{filteredPayments.length} payments</div>` inside Total Payments div
