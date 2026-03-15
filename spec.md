# ClearPay – Project Locations Map Controls

## Current State

The Dashboard has a `ProjectLocationsMap.tsx` component using **Leaflet.js** (OpenStreetMap). It shows:
- A card map preview with project markers (blue=ongoing, purple=completed)
- Hover tooltip showing project name
- "View +" button opening a fullscreen modal
- Legend showing ongoing/completed colors

No map control panel exists yet.

## Requested Changes (Diff)

### Add
- A collapsible/panel sidebar inside the fullscreen map modal (and a compact version in the card preview) with Google Maps-style controls:
  - **Map Details** section: toggles for Transit, Traffic, Biking, Terrain, Wildfires, Air Quality (implemented via open tile overlays/layers in Leaflet)
  - **Map Tools** section: Travel Time (click two points, show distance + estimate) and Measure (polyline distance measurement)
  - **Map Type** section: Default (OpenStreetMap) | Satellite (Esri World Imagery)
  - **Globe View** toggle: switches to a CSS 3D globe perspective effect (Leaflet does not support true WebGL globe — use a visual perspective transform and allow full zoom-out)
  - **Labels** toggle: when OFF, switch to a no-label tile layer (Esri WorldGrayCanvas or OSM without labels); when ON, restore default labeled tiles
- Control panel appears as a right-side panel inside fullscreen map modal, styled like Google Maps side panel (white card, grouped sections with dividers, toggle switches)
- A compact "controls" button on the card preview opens the fullscreen modal

### Modify
- `ProjectLocationsMap.tsx` — add all controls to the `MapView` component and fullscreen modal. Map controls only affect display; no backend changes.

### Remove
- Nothing removed

## Implementation Plan

1. Add tile layer URLs for: Satellite (Esri), Terrain (Esri WorldShadedRelief), Cycling overlay (CyclOSM), Transit (ÖPNV overlay), Stamen Toner-lite (no-label)
2. Add state: `mapType` (default|satellite), `overlays` (transit|traffic|biking|terrain|wildfires|airquality toggles), `globeView`, `showLabels`, `activeTool` (none|measure|traveltime)
3. In `MapView`, update Leaflet whenever state changes: switch base tile layer, add/remove overlay layers
4. Build control panel UI as a fixed right-side panel inside fullscreen modal:
   - Section: Map Details (7 toggles with icons)
   - Section: Map Tools (2 buttons: Travel Time, Measure — activate interactive click mode)
   - Section: Map Type (2 radio buttons: Default, Satellite)
   - Globe View toggle row
   - Labels toggle row
5. Measure tool: on activate, capture click points on map, draw polyline, show distance in km/m popup
6. Travel Time tool: on activate, capture two click points, compute straight-line distance, estimate travel time at 40km/h driving speed, show info popup
7. Globe View: apply a CSS perspective + rotateX transform to the map container to give 3D tilt effect; revert on disable
8. Labels toggle: swap base layer to no-label variant when off
9. Keep all existing marker, tooltip, zoom, and fullscreen behaviors unchanged
10. No backend changes, no other module changes
