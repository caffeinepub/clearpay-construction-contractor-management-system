import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  Layers,
  MapPin,
  Maximize2,
  Ruler,
  Timer,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ProjectLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isCompleted: boolean;
};

type Props = {
  projectLocations: ProjectLocation[];
};

type MapOverlays = {
  transit: boolean;
  traffic: boolean;
  biking: boolean;
  terrain: boolean;
  streetview: boolean;
  wildfires: boolean;
  airquality: boolean;
};

type MapControls = {
  mapType: "default" | "satellite";
  overlays: MapOverlays;
  globeView: boolean;
  showLabels: boolean;
  activeTool: "none" | "measure" | "traveltime";
  controlsOpen: boolean;
};

const DEFAULT_CONTROLS: MapControls = {
  mapType: "default",
  overlays: {
    transit: false,
    traffic: false,
    biking: false,
    terrain: false,
    streetview: false,
    wildfires: false,
    airquality: false,
  },
  globeView: false,
  showLabels: true,
  activeTool: "none",
  controlsOpen: true,
};

// Module-level helper so it’s always stable (no closure issues)
function getLeaflet(): any {
  return (window as any).L;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
}

function fmtTime(km: number): string {
  const hrs = km / 40;
  if (hrs < 1) return `${Math.round(hrs * 60)} min`;
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getBaseTile(
  mapType: "default" | "satellite",
  showLabels: boolean,
): { url: string; options: Record<string, unknown> } {
  if (mapType === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      options: { attribution: "Esri World Imagery", maxZoom: 19 },
    };
  }
  if (!showLabels) {
    return {
      url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      options: { attribution: "© CartoDB", maxZoom: 19 },
    };
  }
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { attribution: "© OpenStreetMap contributors", maxZoom: 19 },
  };
}

const OVERLAY_CFG: Record<
  keyof MapOverlays,
  {
    url?: string;
    options?: Record<string, unknown>;
    unavailable?: boolean;
    note?: string;
  }
> = {
  transit: {
    url: "https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png",
    options: { opacity: 0.7, maxZoom: 19 },
  },
  traffic: { unavailable: true, note: "Traffic layer unavailable" },
  biking: {
    url: "https://tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    options: { opacity: 0.8, maxZoom: 19 },
  },
  terrain: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    options: { opacity: 0.55, maxZoom: 19 },
  },
  streetview: {
    unavailable: true,
    note: "Open Google Street View by clicking a marker",
  },
  wildfires: { unavailable: true, note: "Wildfire layer (approximate)" },
  airquality: {
    unavailable: true,
    note: "Air quality data unavailable offline",
  },
};

// ────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? "#0078D7" : "#cbd5e1",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        outline: "none",
      }}
      aria-checked={checked}
      role="switch"
    >
      <span
        style={{
          display: "block",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#888",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "8px 14px 4px",
        fontFamily: "'Century Gothic', sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
  unavailable,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  unavailable?: boolean;
  note?: string;
}) {
  const [showNote, setShowNote] = useState(false);
  const handleToggle = (v: boolean) => {
    if (unavailable && v && note) setShowNote(true);
    else setShowNote(false);
    onChange(v);
  };
  return (
    <div style={{ padding: "0 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          fontFamily: "'Century Gothic', sans-serif",
        }}
      >
        <span style={{ color: "#555555", flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "#333", flex: 1, lineHeight: 1.2 }}>
          {label}
          {unavailable && (
            <span style={{ fontSize: 10, color: "#aaa", marginLeft: 4 }}>
              (unavailable)
            </span>
          )}
        </span>
        <ToggleSwitch checked={checked} onChange={handleToggle} />
      </div>
      {showNote && checked && note && (
        <div
          style={{
            fontSize: 11,
            color: "#666",
            background: "#f0f7ff",
            borderRadius: 4,
            padding: "4px 6px",
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          ℹ️ {note}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
function MapControlPanel({
  controls,
  onChange,
  measureInfo,
  travelInfo,
  onCancelTool,
}: {
  controls: MapControls;
  onChange: (patch: Partial<MapControls>) => void;
  measureInfo: { distance: number; points: number } | null;
  travelInfo: string | null;
  onCancelTool: () => void;
}) {
  const setOverlay = (key: keyof MapOverlays, val: boolean) =>
    onChange({ overlays: { ...controls.overlays, [key]: val } });

  return (
    <div
      style={{
        background: "white",
        height: "100%",
        fontFamily: "'Century Gothic', sans-serif",
        overflowY: "auto",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px 10px",
          borderBottom: "1px solid #f0f0f0",
          background: "linear-gradient(135deg, #f8fbff 0%, #fff 100%)",
        }}
      >
        <Layers size={16} color="#0078D7" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>
          Map Controls
        </span>
      </div>

      {/* Active tool info bar */}
      {controls.activeTool !== "none" && (
        <div
          style={{
            margin: "8px 14px",
            background: "#E3F2FD",
            border: "1.5px solid #0078D7",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            color: "#0078D7",
          }}
        >
          {controls.activeTool === "measure" && (
            <>
              <strong>Measure mode</strong>
              {measureInfo && measureInfo.points > 0 ? (
                <div style={{ marginTop: 2, color: "#333", fontSize: 11 }}>
                  Points: {measureInfo.points} · Distance:{" "}
                  {fmtDist(measureInfo.distance)}
                </div>
              ) : (
                <div style={{ color: "#555", fontSize: 11 }}>
                  Click map to add points
                </div>
              )}
            </>
          )}
          {controls.activeTool === "traveltime" && (
            <>
              <strong>Travel Time mode</strong>
              {travelInfo ? (
                <div style={{ marginTop: 2, color: "#333", fontSize: 11 }}>
                  {travelInfo}
                </div>
              ) : (
                <div style={{ color: "#555", fontSize: 11 }}>
                  Click 2 points to calculate
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onCancelTool}
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#D32F2F",
              background: "none",
              border: "1px solid #D32F2F",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontFamily: "'Century Gothic', sans-serif",
            }}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* MAP DETAILS */}
      <SectionTitle>Map Details</SectionTitle>
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>🚌</span>}
        label="Transit"
        checked={controls.overlays.transit}
        onChange={(v) => setOverlay("transit", v)}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>🚦</span>}
        label="Traffic"
        checked={controls.overlays.traffic}
        onChange={(v) => setOverlay("traffic", v)}
        unavailable
        note={OVERLAY_CFG.traffic.note}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>🚲</span>}
        label="Biking"
        checked={controls.overlays.biking}
        onChange={(v) => setOverlay("biking", v)}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>⛰️</span>}
        label="Terrain"
        checked={controls.overlays.terrain}
        onChange={(v) => setOverlay("terrain", v)}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>👁️</span>}
        label="Street View"
        checked={controls.overlays.streetview}
        onChange={(v) => setOverlay("streetview", v)}
        unavailable
        note={OVERLAY_CFG.streetview.note}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>🔥</span>}
        label="Wildfires"
        checked={controls.overlays.wildfires}
        onChange={(v) => setOverlay("wildfires", v)}
        unavailable
        note={OVERLAY_CFG.wildfires.note}
      />
      <ToggleRow
        icon={<span style={{ fontSize: 14 }}>💨</span>}
        label="Air Quality"
        checked={controls.overlays.airquality}
        onChange={(v) => setOverlay("airquality", v)}
        unavailable
        note={OVERLAY_CFG.airquality.note}
      />

      <div style={{ height: 1, background: "#f0f0f0", margin: "6px 0" }} />

      {/* MAP TOOLS */}
      <SectionTitle>Map Tools</SectionTitle>
      <div style={{ display: "flex", gap: 8, padding: "4px 14px 8px" }}>
        {(
          [
            { key: "traveltime", label: "Travel Time", Icon: Timer },
            { key: "measure", label: "Measure", Icon: Ruler },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            data-ocid={`map.${key}_button`}
            onClick={() =>
              onChange({
                activeTool: controls.activeTool === key ? "none" : key,
              })
            }
            style={{
              flex: 1,
              padding: "8px 6px",
              fontSize: 11,
              fontFamily: "'Century Gothic', sans-serif",
              fontWeight: controls.activeTool === key ? 700 : 400,
              background: controls.activeTool === key ? "#E3F2FD" : "#f8f8f8",
              border:
                controls.activeTool === key
                  ? "2px solid #0078D7"
                  : "1.5px solid #ddd",
              borderRadius: 8,
              cursor: "pointer",
              color: controls.activeTool === key ? "#0078D7" : "#555",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s",
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "#f0f0f0", margin: "2px 0" }} />

      {/* MAP TYPE */}
      <SectionTitle>Map Type</SectionTitle>
      <div style={{ display: "flex", gap: 8, padding: "4px 14px 10px" }}>
        {(["default", "satellite"] as const).map((type) => (
          <button
            key={type}
            type="button"
            data-ocid={`map.type_${type}_button`}
            onClick={() => onChange({ mapType: type })}
            style={{
              flex: 1,
              padding: "10px 6px",
              fontSize: 12,
              fontFamily: "'Century Gothic', sans-serif",
              fontWeight: controls.mapType === type ? 700 : 400,
              background:
                type === "satellite"
                  ? controls.mapType === type
                    ? "#1a1a2e"
                    : "#2d2d4a"
                  : controls.mapType === type
                    ? "#e8f4fd"
                    : "#f5f5f5",
              border:
                controls.mapType === type
                  ? "2px solid #0078D7"
                  : "1.5px solid #ddd",
              borderRadius: 8,
              cursor: "pointer",
              color: type === "satellite" ? "#fff" : "#333",
              transition: "all 0.15s",
              textTransform: "capitalize",
            }}
          >
            {type === "satellite" ? "🛰️" : "🗺️"} {type}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "#f0f0f0", margin: "2px 0" }} />

      {/* GLOBE VIEW */}
      <SectionTitle>Globe View</SectionTitle>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px 10px",
        }}
      >
        <Globe size={16} color="#555" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#333", flex: 1 }}>3D Globe</span>
        <ToggleSwitch
          checked={controls.globeView}
          onChange={(v) => onChange({ globeView: v })}
        />
      </div>

      <div style={{ height: 1, background: "#f0f0f0", margin: "2px 0" }} />

      {/* LABELS */}
      <SectionTitle>Labels</SectionTitle>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px 12px",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>🏷️</span>
        <span style={{ fontSize: 13, color: "#333", flex: 1 }}>
          Show Labels
        </span>
        <ToggleSwitch
          checked={controls.showLabels}
          onChange={(v) => onChange({ showLabels: v })}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
function MapView({
  locations,
  height,
  controls,
  onMeasureInfo,
  onTravelInfo,
}: {
  locations: ProjectLocation[];
  height: string;
  controls?: MapControls;
  onMeasureInfo?: (info: { distance: number; points: number } | null) => void;
  onTravelInfo?: (info: string | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const overlayLayersRef = useRef<Record<string, any>>({});
  const toolCleanupRef = useRef<(() => void) | null>(null);
  const prevZoomRef = useRef<number>(10);
  const [mapReady, setMapReady] = useState(false);

  // Keep refs current on every render — used inside event handlers / callbacks
  const onMeasureInfoRef = useRef(onMeasureInfo);
  const onTravelInfoRef = useRef(onTravelInfo);
  const controlsRef = useRef(controls);
  onMeasureInfoRef.current = onMeasureInfo;
  onTravelInfoRef.current = onTravelInfo;
  controlsRef.current = controls;

  // Extract stable primitive deps so effects have clean dependency arrays
  const mapType = controls?.mapType ?? "default";
  const showLabels = controls?.showLabels ?? true;
  const globeView = controls?.globeView ?? false;
  const activeTool = controls?.activeTool ?? "none";
  const overlaysStr = controls ? JSON.stringify(controls.overlays) : "";

  // ── Map init (re-runs only when locations changes) ──────────────────
  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    const loadLeaflet = () =>
      new Promise<void>((resolve) => {
        if (getLeaflet()) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => resolve();
        document.head.appendChild(s);
      });

    loadLeaflet().then(() => {
      const L = getLeaflet();
      // @ts-ignore
      L.Icon.Default.prototype._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        baseLayerRef.current = null;
        overlayLayersRef.current = {};
        if (toolCleanupRef.current) {
          toolCleanupRef.current();
          toolCleanupRef.current = null;
        }
      }
      if (!mapRef.current) return;

      const center: [number, number] = [locations[0].lat, locations[0].lng];
      const map = L.map(mapRef.current, {
        center,
        zoom: 10,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      // Base tile reads from ref so it stays current without being a dep
      const mt = controlsRef.current?.mapType ?? "default";
      const sl = controlsRef.current?.showLabels ?? true;
      const { url, options } = getBaseTile(mt, sl);
      baseLayerRef.current = L.tileLayer(url, options).addTo(map);

      for (const loc of locations) {
        const color = loc.isCompleted ? "#9C27B0" : "#0078D7";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -30],
        });
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
        marker.bindTooltip(
          `<div style="font-family:'Century Gothic',sans-serif;font-weight:bold;color:#0078D7;font-size:13px;white-space:nowrap">${loc.name}</div>`,
          {
            permanent: false,
            sticky: false,
            direction: "top",
            offset: [0, -30],
          },
        );
      }

      if (locations.length > 1) {
        const bounds = L.latLngBounds(
          locations.map((l) => [l.lat, l.lng] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      setMapReady(true);
    });

    return () => {
      if (toolCleanupRef.current) {
        toolCleanupRef.current();
        toolCleanupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        baseLayerRef.current = null;
        overlayLayersRef.current = {};
      }
      setMapReady(false);
    };
  }, [locations]); // eslint-disable-line -- intentional: location-only dep

  // ── Base tile update ─────────────────────────────────────────────────
  const applyBaseTile = useCallback(
    (mt: "default" | "satellite", sl: boolean) => {
      const L = getLeaflet();
      const map = mapInstanceRef.current;
      if (!L || !map) return;
      if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
      const { url, options } = getBaseTile(mt, sl);
      const layer = L.tileLayer(url, options).addTo(map);
      if (layer.bringToBack) layer.bringToBack();
      baseLayerRef.current = layer;
    },
    [],
  );

  useEffect(() => {
    if (!mapReady) return;
    applyBaseTile(mapType, showLabels);
  }, [mapReady, mapType, showLabels, applyBaseTile]);

  // ── Overlay tiles ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const L = getLeaflet();
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    const overlays = JSON.parse(overlaysStr || "{}") as Partial<MapOverlays>;
    for (const key of Object.keys(OVERLAY_CFG) as (keyof MapOverlays)[]) {
      const enabled = !!(overlays as MapOverlays)[key];
      const cfg = OVERLAY_CFG[key];
      if (cfg.unavailable || !cfg.url) {
        if (overlayLayersRef.current[key]) {
          map.removeLayer(overlayLayersRef.current[key]);
          delete overlayLayersRef.current[key];
        }
        continue;
      }
      if (enabled && !overlayLayersRef.current[key]) {
        overlayLayersRef.current[key] = L.tileLayer(
          cfg.url,
          cfg.options ?? {},
        ).addTo(map);
      } else if (!enabled && overlayLayersRef.current[key]) {
        map.removeLayer(overlayLayersRef.current[key]);
        delete overlayLayersRef.current[key];
      }
    }
  }, [mapReady, overlaysStr]);

  // ── Globe View ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    if (globeView) {
      prevZoomRef.current = map.getZoom();
      mapRef.current.style.transform =
        "perspective(800px) rotateX(20deg) scale(1.15)";
      mapRef.current.style.transformOrigin = "center center";
      mapRef.current.style.transition = "transform 0.4s ease";
      map.setZoom(3);
    } else {
      mapRef.current.style.transform = "";
      mapRef.current.style.transition = "transform 0.4s ease";
      map.setZoom(prevZoomRef.current);
    }
  }, [mapReady, globeView]);

  // ── Tool mode ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const L = getLeaflet();
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (toolCleanupRef.current) {
      toolCleanupRef.current();
      toolCleanupRef.current = null;
    }

    if (activeTool === "none") {
      if (wrapperRef.current) wrapperRef.current.style.cursor = "";
      return;
    }

    if (wrapperRef.current) wrapperRef.current.style.cursor = "crosshair";

    if (activeTool === "measure") {
      const points: [number, number][] = [];
      const markers: any[] = [];
      let polyline: any = null;

      const handler = (e: any) => {
        const { lat, lng } = e.latlng;
        points.push([lat, lng]);
        const dot = L.circleMarker([lat, lng], {
          radius: 5,
          color: "#0078D7",
          fillColor: "#0078D7",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        markers.push(dot);
        if (polyline) map.removeLayer(polyline);
        if (points.length > 1) {
          polyline = L.polyline(points, {
            color: "#0078D7",
            weight: 2,
            dashArray: "6 4",
          }).addTo(map);
          let total = 0;
          for (let i = 1; i < points.length; i++)
            total += haversineKm(
              points[i - 1][0],
              points[i - 1][1],
              points[i][0],
              points[i][1],
            );
          onMeasureInfoRef.current?.({
            distance: total,
            points: points.length,
          });
        } else {
          onMeasureInfoRef.current?.({ distance: 0, points: 1 });
        }
      };

      map.on("click", handler);
      toolCleanupRef.current = () => {
        map.off("click", handler);
        if (polyline) map.removeLayer(polyline);
        for (const m of markers) map.removeLayer(m);
        onMeasureInfoRef.current?.(null);
        if (wrapperRef.current) wrapperRef.current.style.cursor = "";
      };
    } else if (activeTool === "traveltime") {
      const pts: [number, number][] = [];
      const markers: any[] = [];
      let line: any = null;

      const handler = (e: any) => {
        if (pts.length >= 2) return;
        const { lat, lng } = e.latlng;
        pts.push([lat, lng]);
        const label = pts.length === 1 ? "A" : "B";
        const color = pts.length === 1 ? "#28A745" : "#FFA500";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;font-family:'Century Gothic',sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        markers.push(L.marker([lat, lng], { icon }).addTo(map));
        if (pts.length === 2) {
          line = L.polyline(pts, {
            color: "#FFA500",
            weight: 2,
            dashArray: "6 4",
          }).addTo(map);
          const dist = haversineKm(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
          onTravelInfoRef.current?.(
            `Distance: ${fmtDist(dist)} · Est. drive: ${fmtTime(dist)}`,
          );
          if (wrapperRef.current) wrapperRef.current.style.cursor = "";
        }
      };

      map.on("click", handler);
      toolCleanupRef.current = () => {
        map.off("click", handler);
        if (line) map.removeLayer(line);
        for (const m of markers) map.removeLayer(m);
        onTravelInfoRef.current?.(null);
        if (wrapperRef.current) wrapperRef.current.style.cursor = "";
      };
    }
  }, [mapReady, activeTool]);

  if (locations.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
      >
        <MapPin className="h-10 w-10 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400 font-normal">
          No project locations saved yet
        </p>
        <p className="text-xs text-gray-300 mt-1">
          Add coordinates in the Project form
        </p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        height,
        width: "100%",
        position: "relative",
        borderRadius: controls ? 0 : 8,
        overflow: controls ? "visible" : "hidden",
      }}
    >
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: controls ? 0 : 8,
        }}
        data-ocid="dashboard.map_marker"
      />
    </div>
  );
}

export default function ProjectLocationsMap({ projectLocations }: Props) {
  const [fullScreen, setFullScreen] = useState(false);
  const [controls, setControls] = useState<MapControls>(DEFAULT_CONTROLS);
  const [measureInfo, setMeasureInfo] = useState<{
    distance: number;
    points: number;
  } | null>(null);
  const [travelInfo, setTravelInfo] = useState<string | null>(null);

  const patchControls = useCallback((patch: Partial<MapControls>) => {
    setControls((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCancelTool = useCallback(() => {
    setControls((prev) => ({ ...prev, activeTool: "none" }));
    setMeasureInfo(null);
    setTravelInfo(null);
  }, []);

  const handleClose = () => {
    setFullScreen(false);
    setControls(DEFAULT_CONTROLS);
    setMeasureInfo(null);
    setTravelInfo(null);
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Card preview */}
      <Card
        className="shadow-md rounded-xl bg-white"
        data-ocid="dashboard.map_marker"
        style={fullScreen ? { visibility: "hidden" } : {}}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#0078D7]" />
            <CardTitle className="text-lg font-bold text-[#555555]">
              Project Locations
            </CardTitle>
            <span className="text-xs bg-[#E3F2FD] text-[#0078D7] px-2 py-0.5 rounded-full font-normal">
              {projectLocations.length} location
              {projectLocations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullScreen(true)}
            className="h-8 px-3 text-xs text-[#0078D7] hover:bg-blue-50 font-normal flex items-center gap-1"
            data-ocid="dashboard.map_open_modal_button"
          >
            <Maximize2 className="h-4 w-4" />
            View +
          </Button>
        </CardHeader>
        <CardContent>
          <MapView locations={projectLocations} height="320px" />
          {projectLocations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {projectLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-1.5 text-xs text-[#555555] bg-gray-50 px-2 py-1 rounded-full border font-normal"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: loc.isCompleted ? "#9C27B0" : "#0078D7",
                    }}
                  />
                  {loc.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Screen Modal */}
      {fullScreen && (
        <div
          className="fixed inset-0 flex flex-col bg-white"
          style={{ zIndex: 9999 }}
          data-ocid="dashboard.map_modal"
        >
          {/* Header */}
          <div
            style={{ zIndex: 10001, position: "relative" }}
            className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#0078D7]" />
              <span className="text-lg font-bold text-[#555555]">
                Project Locations
              </span>
              <span className="text-xs bg-[#E3F2FD] text-[#0078D7] px-2 py-0.5 rounded-full font-normal">
                {projectLocations.length} location
                {projectLocations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-[#555555]">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#0078D7]" /> Ongoing
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#9C27B0]" />{" "}
                  Completed
                </div>
              </div>
              {/* Controls toggle */}
              <button
                type="button"
                onClick={() =>
                  patchControls({ controlsOpen: !controls.controlsOpen })
                }
                data-ocid="map.controls_toggle"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontFamily: "'Century Gothic', sans-serif",
                  background: controls.controlsOpen ? "#E3F2FD" : "#f8f8f8",
                  border: controls.controlsOpen
                    ? "1.5px solid #0078D7"
                    : "1.5px solid #ddd",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: controls.controlsOpen ? "#0078D7" : "#555",
                }}
              >
                <Layers size={14} />
                {controls.controlsOpen ? "Hide Controls" : "Show Controls"}
              </button>
              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-red-50"
                data-ocid="dashboard.map_close_button"
              >
                <X className="h-5 w-5 text-[#D32F2F]" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Map */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <MapView
                locations={projectLocations}
                height="100%"
                controls={controls}
                onMeasureInfo={setMeasureInfo}
                onTravelInfo={setTravelInfo}
              />
            </div>
            {/* Side panel */}
            {controls.controlsOpen && (
              <div
                style={{
                  width: 260,
                  height: "100%",
                  overflowY: "auto",
                  boxShadow: "-4px 0 16px rgba(0,0,0,0.1)",
                  zIndex: 10000,
                  flexShrink: 0,
                  background: "white",
                }}
              >
                <MapControlPanel
                  controls={controls}
                  onChange={patchControls}
                  measureInfo={measureInfo}
                  travelInfo={travelInfo}
                  onCancelTool={handleCancelTool}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
