import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function MapView({
  locations,
  height,
}: { locations: ProjectLocation[]; height: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    import("leaflet").then((L) => {
      // @ts-ignore
      L.default.Icon.Default.prototype._getIconUrl = undefined;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!mapRef.current) return;

      const center: [number, number] = [locations[0].lat, locations[0].lng];
      const map = L.default.map(mapRef.current, {
        center,
        zoom: 10,
        scrollWheelZoom: true,
      });

      L.default
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);

      markersRef.current = [];
      for (const loc of locations) {
        const color = loc.isCompleted ? "#9C27B0" : "#0078D7";
        const icon = L.default.divIcon({
          className: "",
          html: `<div style="
            width: 28px;
            height: 28px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -30],
        });

        const marker = L.default
          .marker([loc.lat, loc.lng], { icon })
          .addTo(map);

        // Show project name on hover (tooltip), not click
        marker.bindTooltip(
          `<div style="font-family: 'Century Gothic', sans-serif; font-weight: bold; color: #0078D7; font-size: 13px; white-space: nowrap;">${loc.name}</div>`,
          {
            permanent: false,
            sticky: false,
            direction: "top",
            offset: [0, -30],
          },
        );

        markersRef.current.push(marker);
      }

      if (locations.length > 1) {
        const bounds = L.default.latLngBounds(
          locations.map((l) => [l.lat, l.lng] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

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
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
      data-ocid="dashboard.map_marker"
    />
  );
}

export default function ProjectLocationsMap({ projectLocations }: Props) {
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <Card
        className="shadow-md rounded-xl bg-white"
        data-ocid="dashboard.map_marker"
        // Hide the card map visually when full screen is open to avoid z-index overlap
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

      {/* Full Screen Modal — z-index 9999 to sit above all Leaflet layers */}
      {fullScreen && (
        <div
          className="fixed inset-0 flex flex-col bg-white"
          style={{ zIndex: 9999 }}
          data-ocid="dashboard.map_modal"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
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
              <div className="flex items-center gap-3 text-xs text-[#555555]">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#0078D7]" />
                  Ongoing
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                  Completed
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullScreen(false)}
                className="h-8 w-8 p-0 hover:bg-red-50"
                data-ocid="dashboard.map_close_button"
              >
                <X className="h-5 w-5 text-[#D32F2F]" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <MapView locations={projectLocations} height="100%" />
          </div>
        </div>
      )}
    </>
  );
}
