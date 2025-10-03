"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

// icon kurir & tujuan
const courierIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854866.png",
  iconSize: [35, 35],
  iconAnchor: [17, 34],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  iconAnchor: [17, 34],
});

interface TrackingMapProps {
  courier: { lat: number; lng: number };
  destination: [number, number];
  osrmRoute: [number, number][];
  eta?: string;
}

function AnimatedCourierMarker({ courier }: { courier: { lat: number; lng: number } }) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      const marker = markerRef.current;

      if (marker.slideTo) {
        // animate ke lokasi baru
        // durasi bisa disesuaikan: 1500 ms = 1 detik
        // keepAtCenter: true agar map ikut geser mengikuti kurir
        marker.slideTo([courier.lat, courier.lng], {
          duration: 1500,
          keepAtCenter: false,
        });
      } else {
        // fallback tanpa animasi
        marker.setLatLng([courier.lat, courier.lng]);
      }
    }
  }, [courier]);

  return (
    <Marker
      position={[courier.lat, courier.lng]}
      icon={courierIcon}
      ref={markerRef}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
        🚚 Kurir
      </Tooltip>
    </Marker>
  );
}

export default function TrackingMap({
  courier,
  destination,
  osrmRoute,
  eta,
}: TrackingMapProps) {
  const bounds = [
    [courier.lat, courier.lng],
    [destination[0], destination[1]],
  ] as L.LatLngBoundsLiteral;

  useEffect(() => {
    // set tinggi map
    setTimeout(() => {
      const mapEl = document.querySelector(".leaflet-container") as HTMLElement;
      if (mapEl) mapEl.style.height = "500px";
    }, 100);
  }, []);

  return (
    <div style={{ marginTop: 16, borderRadius: 8, overflow: "hidden" }}>
      <MapContainer
        bounds={bounds}
        style={{ width: "100%", height: "500px" }}
        scrollWheelZoom={true}
      >
        {/* Tile basemap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marker kurir (animated) */}
        <AnimatedCourierMarker courier={courier} />

        {/* Marker tujuan */}
        <Marker position={destination} icon={destinationIcon}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
            🎯 Tujuan
          </Tooltip>
        </Marker>

        {/* Route polyline */}
        {osrmRoute.length > 0 && (
          <Polyline
            positions={osrmRoute}
            color="blue"
            weight={5}
            opacity={0.7}
          />
        )}
      </MapContainer>

      {/* ETA overlay */}
      {eta && (
        <div
          style={{
            marginTop: 8,
            background: "#007bff",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 6,
            display: "inline-block",
            fontSize: 14,
          }}
        >
          ⏱️ Estimasi Tiba: {eta}
        </div>
      )}
    </div>
  );
}