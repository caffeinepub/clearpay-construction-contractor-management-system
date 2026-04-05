# BMS – Neon Glow Theme Full Coverage

## Current State
The app has a working ThemeContext (`/context/ThemeContext.tsx`) that sets `data-theme="neon"` on `document.documentElement` and persists to localStorage. The header toggle button calls `toggleTheme()` with a single click.

A Neon CSS block already exists in `index.css` (lines ~241–450), covering:
- body, bg-white, bg-gray-*, sidebar, header, table, inputs, dialogs, footer
- Aggressive `html[data-theme="neon"]` overrides for `div[style*="background: #fff"]`, `div[style*="color: #333"]`, `div[style*="minHeight"]`

## Requested Changes (Diff)

### Add
- More comprehensive neon CSS overrides targeting inline `style` attributes that are NOT currently covered:
  - `div[style*="background: #f5f5f5"]`, `div[style*="background: #f0f0f0"]`, `div[style*="background: #fafafa"]`
  - `div[style*="background: #E3F2FD"]`, `div[style*="background: #FFEBEE"]`, `div[style*="background: #E8F5E9"]` (table zebra rows)
  - `div[style*="background: #FFF8E1"]`, `div[style*="background: #FFF9C4"]` (ticker/highlight)
  - `span[style*="color: #0078D7"]`, `div[style*="color: #0078D7"]` → neon blue
  - `span[style*="color: #28A745"]`, `div[style*="color: #28A745"]` → neon green
  - `span[style*="color: #D32F2F"]`, `div[style*="color: #D32F2F"]` → neon magenta
  - `button[style*="background"]` catch-all for primary/action buttons
  - `[style*="border: 1px solid #"]` → neon border
  - `[style*="boxShadow"]` → neon glow shadow replacement
  - Modal overlay (`[style*="position: fixed"][style*="inset"]`, `.modal-overlay`, `[class*="overlay"]`) → dark semi-transparent
  - Receipt view containers (all view modal backgrounds)
  - Sticky header and toolbar areas
  - Summary/stat cards (inline-styled)
  - Select/option dropdowns
  - Badge and tag elements
  - Neon scrolling ticker area
  - PayGo page components
  - SFT page components
  - Analytics/Charts backgrounds

- CSS variables update in `[data-theme="neon"]` block to set CSS variable overrides that components like shadcn rely on (background, foreground, card, border, input etc.) using `color: oklch(...)` to match neon palette

- Glow animation keyframe for neon pulsing effect on active nav items and primary buttons:
```css
@keyframes neonPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(0,212,255,0.4); }
  50% { box-shadow: 0 0 20px rgba(0,212,255,0.8), 0 0 40px rgba(184,41,255,0.3); }
}
```

- Gradient text effect for page headings in neon mode
- Glassmorphism effect for sticky headers and toolbars
- Holographic shimmer on sidebar active item

### Modify
- Expand existing neon CSS overrides to also cover `tr[style*="background"]` for zebra rows → make transparent with neon tint
- Fix: `html[data-theme="neon"] div[style*="background"]` should be a broader selector to catch all bg colors
- The header toggle button: already works, no changes to JS needed
- Ensure all pages (ContractorsPage, ProjectsPage, BillsPage, PaymentsPage, ReportsPage, AnalyticsPage, SFTPage, SeriAIPage, DashboardPage, all PayGo pages, UsersPage) are covered by CSS-only neon overrides – no TSX changes needed if CSS is comprehensive enough

### Remove
- Nothing removed

## Implementation Plan
1. Expand `index.css` neon theme block with comprehensive selectors covering:
   - All inline background color variants used in the app
   - All inline text color variants
   - Table zebra stripe rows (`tr` with inline bg)
   - Sticky header/toolbar glassmorphism
   - Modal overlays and dialog backgrounds
   - Summary card and stat box backgrounds
   - Button inline styles (primary, delete, action)
   - Select/option dropdown backgrounds
   - Neon pulse animation for active/primary elements
   - Gradient text for headings
   - Border and box-shadow overrides for inline styles
2. Add CSS variable overrides inside `[data-theme="neon"]` for shadcn components to pick up
3. Validate build passes (lint + typecheck + build)
