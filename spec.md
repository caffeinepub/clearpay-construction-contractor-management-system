# BMS - ClearPay Billing Management System

## Current State

The app is a full-stack construction contractor management system (ClearPay / BMS). The frontend is React/TypeScript/Tailwind. Current relevant state:

- `src/frontend/index.html` — title is "ClearPay", favicon is `/assets/logo mkt-1.png`
- `src/frontend/src/context/ThemeContext.tsx` — single `toggleTheme()` that toggles between `light` and `neon` on each click
- `src/frontend/src/components/MainLayout.tsx` — theme button calls `toggleTheme` on `onClick`, single click behavior
- `src/frontend/src/utils/receiptShare.ts` — watermark drawn with `ctx.globalAlpha = 0.1` (10%)
- `src/frontend/src/pages/ContractorsPage.tsx` — Bills/Payments/Reports tabs have filter dropdowns for Contractors and Projects. Filter options are computed via `bContractorOptions`, `bProjectOptions`, `pContractorOptions`, `pProjectOptions`, `rContractorOptions`, `rProjectOptions` — these are already data-driven via `useMemo`. The filter logic in `filteredBills`, `filteredPayments`, `rFilteredBills`, `rFilteredPayments` compares `b.contractorId !== bFilter.contractorId`. The issue is the filter may not visually reset the project dropdown when contractor changes, or there's an ID mismatch between what the backend returns and what the contractor records have.

## Requested Changes (Diff)

### Add
- Nothing new to add architecturally

### Modify

1. **Browser tab title**: `src/frontend/index.html` — change `<title>ClearPay</title>` to `<title>BMS</title>`. Change favicon `href` from `/assets/logo mkt-1.png` to `/assets/download-019d4d69-cb7e-768d-a6d7-f61a837e1144.webp` (the newly attached BMS logo)

2. **Theme button behavior**: In `MainLayout.tsx`, change the Neon theme button from single-click toggle to:
   - Single click → switch to **Light** theme (always)
   - Double click → switch to **Neon/Cyberpunk** theme (always)
   - This means the button always shows the current state and responds to click/dblclick events
   - In `ThemeContext.tsx`, expose both `setLightTheme()` and `setNeonTheme()` (or keep `toggleTheme` + add `activateNeon`)
   - In `MainLayout.tsx`: `onClick` → `setTheme('light')`, `onDoubleClick` → `setTheme('neon')`. The button title should say "Single click = Light | Double click = Neon"

3. **Receipt watermark opacity**: In `src/frontend/src/utils/receiptShare.ts`, change `ctx.globalAlpha = 0.1` to `ctx.globalAlpha = 0.2` (20% opacity). Also update the logo image path to use the new BMS logo if it's been saved as an asset.

4. **Contractors Module filters (Bills/Payments/Reports)**: The filter dropdowns in ContractorsPage.tsx already have the correct logic. The problem is likely that `b.contractorId` values from the backend are strings but may have extra whitespace or not match exactly. Fix by:
   - In `bContractorOptions`, `pContractorOptions`, `rContractorOptions`: ensure IDs are `.trim()`ped when extracting from bills/payments
   - In `filteredBills`, `filteredPayments`, `rFilteredBills`, `rFilteredPayments`: trim both sides of the comparison: `b.contractorId.trim() !== bFilter.contractorId.trim()`
   - In `bProjectOptions`, `pProjectOptions`, `rProjectOptions`: same trim treatment
   - Ensure when a contractor is selected in the filter dropdown, the project dropdown immediately narrows to only projects that have bills/payments for that contractor
   - Also ensure `filteredBills` uses `b.contractorId.trim() === bFilter.contractorId` (not !=) correctly — double-check the filter logic direction

### Remove
- Nothing to remove

## Implementation Plan

1. Update `index.html`: title → "BMS", favicon → new BMS logo asset path
2. Update `ThemeContext.tsx`: add `setLightTheme` and `setNeonTheme` methods (or expose a `setTheme` setter)
3. Update `MainLayout.tsx`: change theme button to use `onClick` for light, `onDoubleClick` for neon. Update button tooltip to reflect behavior.
4. Update `receiptShare.ts`: change watermark opacity from 0.1 to 0.2
5. Update `ContractorsPage.tsx` filter logic: add `.trim()` to ID comparisons in `filteredBills`, `filteredPayments`, `rFilteredBills`, `rFilteredPayments`, and in the contractor/project options `useMemo` functions. Ensure project options properly cascade from contractor selection.
