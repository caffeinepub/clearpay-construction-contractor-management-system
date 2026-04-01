# Billing Management System

## Current State
- Sidebar toggle shows "ClearPay" and "PayGo" labels
- Below toggle: branding section with logo image, app name (ClearPay/PayGo), and tagline
- Contractors Module Bills/Payments/Reports filter dropdowns have data issues (showing all or defaulting to first entry)
- Header has keyboard shortcuts button; ThemeContext is a stub always returning "light"

## Requested Changes (Diff)

### Add
- Fixed toolbar-width logo banner below the toggle (using `/assets/bms_logo_3-019d489a-4c4a-750d-bff5-483863e1ff92.png`) – same image for both MKT and MPH modes, fills sidebar width
- Theme toggle button in the app header, left of the keyboard shortcuts button, to switch between Light Theme and Neon Glow Theme
- Neon Glow Theme CSS: dark background (#0a0a0f / #0d0d1a), electric blue (#00d4ff), purple (#b829ff), magenta (#ff2d78), glowing box-shadows, glassmorphism panels (backdrop-blur, semi-transparent), gradient text and borders, neon glow on sidebar nav items and cards

### Modify
- Sidebar toggle labels: "ClearPay" → "MKT", "PayGo" → "MPH"
- Remove old branding section (logo img, app name text, tagline text) that was below the toggle; replace with the full-width banner image
- ThemeContext: replace stub with real state (light | neon) persisted to localStorage; provide useTheme() hook returning current theme and toggle function
- Contractors Module (ContractorsPage.tsx) Bills filter: derive contractor dropdown options only from contractors present in cBills data; derive project dropdown only from bills of selected contractor; apply filters correctly
- Contractors Module Payments filter: same data-driven approach from cPayments data
- Contractors Module Reports filter: same data-driven approach from report data (bills+payments combined)

### Remove
- Old branding section below the mode toggle (logo, app name, tagline)

## Implementation Plan
1. Update ThemeContext.tsx: add real light/neon state with localStorage persistence
2. Add `.neon` CSS class block to index.css: dark backgrounds, neon color variables, glow effects, glassmorphism utilities, gradient borders; apply via `data-theme="neon"` on document.documentElement
3. Update MainLayout.tsx:
   - Change toggle labels ClearPay→MKT, PayGo→MPH
   - Remove branding section; replace with full-width `<img>` banner (same BMS logo for both modes)
   - Add theme toggle button (sun/moon or palette icon) in header left of keyboard shortcuts
   - Apply neon theme classes to sidebar, header, nav items conditionally
4. Update ContractorsPage.tsx:
   - Bills tab: derive `billContractorOptions` from unique contractorIds in cBills; derive `billProjectOptions` from bills filtered by selected contractor; apply both filters to filteredBills
   - Payments tab: same pattern from cPayments
   - Reports tab: same pattern from combined report data
