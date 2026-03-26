# ClearPay – Build 1: SFT Module

## Current State
ClearPay has Projects, Bills, Payments, Contractors, Reports, Analytics, Dashboard, Users, and Seri AI modules. The Contractors module stores bills with Area (SFT) data. There is no dedicated SFT tracking module yet.

## Requested Changes (Diff)

### Add
- New `SFT` module/page with a structured table: Contractor, Bill No, Slab No, Project, Footings, R/W, Columns, Beams, Slab, OHT, Total SFT
- Toolbar: Print, PDF, Import CSV, Export CSV, Format, + New buttons, Contractor filter, Project filter, Clear button
- Three dynamic summary boxes:
  - Contractor: shows selected contractor name when filtered, else empty
  - Project: shows selected project name when filtered, else empty  
  - Total SFT: sum of Total SFT values based on active filters
- New form (modal): Contractor (dropdown from contractors list), Bill No, Slab No, Project (dropdown from projects), Footings, R/W, Columns, Beams, Slab, OHT, Total SFT (auto-calculated as sum of Footings+R/W+Columns+Beams+Slab+OHT), Remarks
- Row-level actions: View, Edit, Delete with password confirmation for Edit/Delete
- Multi-select checkboxes for bulk delete (visible only when rows selected)
- Import CSV and Format hidden for Users role
- View receipt: themed colored border, Print and Share icons top-right, A5 format
- Backend: `addSftEntry`, `updateSftEntry`, `listSftEntries`, `deleteSftEntries` functions in main.mo
- Navigation: add "sft" page to NavigationContext, MainLayout sidebar, keyboard shortcut Alt+F

### Modify
- `NavigationContext.tsx`: add `"sft"` to Page union type
- `MainLayout.tsx`: add SFT nav item and page render case
- `backend.d.ts`: add SFT function signatures
- `backend.ts`: add SFT wrapper methods

### Remove
- Nothing removed

## Implementation Plan
1. Add SFT data model and CRUD functions to `src/backend/main.mo`
2. Update `src/frontend/src/backend.d.ts` with SFT types and function signatures
3. Update `src/frontend/src/backend.ts` with SFT wrapper methods
4. Add `"sft"` to `NavigationContext.tsx` Page type
5. Create `src/frontend/src/pages/SFTPage.tsx` with full SFT module UI
6. Add SFT nav item in `MainLayout.tsx` and route render

**Design**: Follow ClearPay design system (Century Gothic, #0078D7, #555555, zebra striping). SFT tab color: #E8F4FD (blue tinted). Print receipt uses blue border (#0078D7).
