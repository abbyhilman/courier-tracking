"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

const courierIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -34],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -34],
});

// linear interpolation
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function AnimatedMarker({ lat, lng, onEnd }: { lat: number; lng: number; onEnd?: (pos: [number, number]) => void; }) {
  const [pos, setPos] = useState<[number, number]>([lat, lng]);
  const prev = useRef<[number, number]>([lat, lng]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = prev.current;
    const end: [number, number] = [lat, lng];
    const duration = 900; // ms
    let startTime: number | null = null;

    function step(ts: number) {
      if (!startTime) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      setPos([lerp(start[0], end[0], t), lerp(start[1], end[1], t)]);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prev.current = end;
        if (onEnd) onEnd(end);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [lat, lng, onEnd]);

  return <Marker position={pos} icon={courierIcon}><Popup>Kurir</Popup></Marker>;
}

// auto-fit map bounds when route changes
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    const bounds = L.latLngBounds(positions as any);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [positions, map]);
  return null;
}

export default function TrackingMap({ courier, destination, osrmRoute, eta }: {
  courier: { lat: number; lng: number };
  destination: [number, number];
  osrmRoute: [number, number][]; // route points from OSRM (lat,lng)
  eta?: string;
}) {
  const [routeHistory, setRouteHistory] = useState<[number, number][]>(() => (courier ? [[courier.lat, courier.lng]] : []));

  const handleMarkerEnd = (pos: [number, number]) => {
    setRouteHistory(prev => {
      const next = [...prev, pos];
      // optional: cap history length to e.g. 500 to protect performance
      if (next.length > 500) next.shift();
      return next;
    });
  };

  // combine history + osrm route optionally. Here we show both:
  const displayRoute = routeHistory; // jejak perjalanan
  const drivingRoute = osrmRoute; // recommended driving path

  return (
    <div>
      <MapContainer center={[courier.lat, courier.lng]} zoom={15} style={{ height: 480, width: "100%", borderRadius: 12 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        <AnimatedMarker lat={courier.lat} lng={courier.lng} onEnd={handleMarkerEnd} />
        <Marker position={destination} icon={destinationIcon}><Popup>Tujuan</Popup></Marker>

        {displayRoute.length > 1 && <Polyline positions={displayRoute} color="#2b8cf1" weight={4} dashArray="4" />}
        {drivingRoute && drivingRoute.length > 1 && <Polyline positions={drivingRoute} color="#0b6623" weight={5} />}
        <FitBounds positions={[...(drivingRoute && drivingRoute.length ? drivingRoute : displayRoute)]} />
      </MapContainer>

      <div style={{ marginTop: 8 }}>
        <div style={{ padding: 12, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <b>Estimasi Tiba:</b> {eta ?? "Menghitung..."}
        </div>
      </div>
    </div>
  );
}
