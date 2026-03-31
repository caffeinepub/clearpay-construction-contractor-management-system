# ClearPay Logo and Filter Fixes

## Current State
Logo is "logo mkt.png". New BMS logo uploaded. ContractorsPage has 4 tabs with broken filters.

## Requested Changes (Diff)

### Add
- Nothing

### Modify
- Replace logo mkt.png with new BMS logo everywhere
- Contractors tab: project filter scoped to selected contractor's projects
- Bills tab: contractor/project dropdowns driven by bills data
- Payments tab: contractor/project dropdowns driven by payments data
- Reports tab: contractor/project dropdowns driven by reports data

### Remove
- Nothing

## Implementation Plan
1. Update all logo references to bms_logo file
2. Fix Contractors tab project dropdown to only show projects linked to selected contractor
3. Fix Bills tab: derive contractor options from bills; project options from bills filtered by contractor
4. Fix Payments tab: same pattern
5. Fix Reports tab: same pattern
