# BMS – Contractors Bills CSV / Watermark / Neon Theme Fixes

## Current State
- Contractors > Bills tab has mismatched column names between downloadFormat template, exportCSV output, and importCSV field mapping
- View receipt modals (browser overlays) do not show a visible watermark; watermark only exists in print popup and canvas share
- Neon Theme toggle uses single-click = Light / double-click = Neon logic, but the theme CSS only covers class-based selectors and cannot override heavy inline styles on the page; the toggle appears non-functional to users

## Requested Changes (Diff)

### Add
- Watermark layer inside all view receipt modals (cViewOpen, bViewOpen, pViewOpen) as a mid-z-index absolutely positioned overlay with 20% opacity logo image
- Aggressive CSS overrides for neon theme targeting inline-style-heavy elements via html[data-theme="neon"] selectors on the document root

### Modify
- `downloadFormat` for Bills: change column names to exactly match exportCSV: `Contractor`, `Project`, `Bill No`, `Block ID`, `Date`, `Item`, `Area`, `Unit`, `Unit Price`, `Gross Amount`, `WR %`, `WR Amount`, `Net Amount (INR)`, `Remarks`
- `importCSV` handler for Bills: update field mapping keys to match the unified column names (`row["Bill No"]`, `row["Block ID"]`, `row["Unit Price"]`, `row["Gross Amount"]`, `row["WR %"]`, `row["WR Amount"]`, `row["Net Amount (INR)"]`)
- Neon Theme toggle: change to simple single-click toggle (click = switch between light and neon) — remove the double-click detection timer pattern which is confusing and unreliable
- CSS neon theme: add `html[data-theme="neon"]` body-level background override and strengthen selectors to cover inline-styled divs

### Remove
- Double-click timer logic for theme switching in `handleThemeClick`

## Implementation Plan
1. In `ContractorsPage.tsx`: Unify Bills Format column names with Export CSV column names; update import field mapping to use the same keys
2. In `ContractorsPage.tsx`: Add watermark overlay inside all three view receipt modals (contractor, bill, payment) using absolute positioning and z-index between background and content
3. In `MainLayout.tsx`: Replace `handleThemeClick` double-click logic with simple toggle (single click switches theme)
4. In `index.css`: Add stronger neon overrides targeting `html[data-theme="neon"]` to override inline styles where possible; add `*` selector override for background/color on neon mode
