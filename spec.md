# ClearPay – PayGo Mode (Part 1)

## Current State
The app is ClearPay, a construction billing management system with modules: Dashboard, Analytics, Projects, Bills, Payments, Contractors, SFT, Reports, Seri AI, Users. All inside MainLayout.tsx with a sidebar navigation.

## Requested Changes (Diff)

### Add
- A mode switcher toggle at the top of the sidebar allowing switching between "ClearPay" and "PayGo" modes
- When PayGo mode is selected, the sidebar branding changes to "PayGo" with its own color/logo treatment
- PayGo mode has its own separate set of modules: Dashboard, Analytics, Projects, Contractors, Payments, Reports, Users, AI Chatbot
- PayGo Dashboard page (new): Summary cards (Total Bills, Completed Payments, Pending Payments) with graphs and filters
- PayGo Projects page (new): Create and manage project details (same fields as ClearPay projects)
- PayGo Contractors page (new): Manage contractor info (name, trade, project, pricing, contact)
- PayGo Payments page (new): Track payments against bills (partial and full), with filters
- PayGo data is fully isolated from ClearPay data – separate state, no shared data
- PayGo uses a green accent color (#28A745) to visually differentiate from ClearPay's blue (#0078D7)

### Modify
- MainLayout.tsx: Add appMode state ('clearpay' | 'paygo'), mode switcher UI, conditional sidebar nav and page rendering based on mode
- NavigationContext.tsx: Add PayGo pages to the Page type

### Remove
- Nothing removed from existing ClearPay functionality

## Implementation Plan
1. Add PayGo page type values to NavigationContext
2. Create PayGoContext or appMode state in MainLayout
3. Add mode switcher toggle UI at top of sidebar (tabs or toggle buttons)
4. Create PayGoDashboardPage.tsx with summary cards and simple bar chart
5. Create PayGoProjectsPage.tsx with add/edit/delete project table
6. Create PayGoContractorsPage.tsx with contractor management table
7. Create PayGoPaymentsPage.tsx with payment tracking table
8. Modify MainLayout to render PayGo pages when in PayGo mode
9. PayGo data stored in local state (no backend changes needed for Part 1)
