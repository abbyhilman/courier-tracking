// app/track/[orderId]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, GeoPoint } from "firebase/firestore";
import { db } from "@/lib/firebease";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
});

export interface Order {
  customerName: string;
  customerAddress: string;
  status: string;
  location: GeoPoint;
  destination: GeoPoint;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Page() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder(snap.data() as Order);
      else setOrder(null);
    });
    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    if (!order?.location || !order?.destination) return;

    const from = {
      lat: order.location.latitude,
      lng: order.location.longitude,
    };
    const to = {
      lat: order.destination.latitude,
      lng: order.destination.longitude,
    };

    (async () => {
      try {
        const res = await fetch("/api/osrm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });

        const text = await res.text();

        // jika bukan JSON -> log body supaya mudah debugging
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) {
          console.error("OSRM proxy returned error:", res.status, text);
          // fallback: hitung jarak langsung
          const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
          const minutes = Math.max(1, Math.round((km / 30) * 60)); // asumsi 30 km/h
          setEta(`${minutes} menit (perkiraan)`);
          setOsrmRoute([]); // kosong
          return;
        }
        if (!contentType.includes("application/json")) {
          console.error("OSRM proxy returned non-JSON response:", text);
          // fallback
          const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
          const minutes = Math.max(1, Math.round((km / 30) * 60));
          setEta(`${minutes} menit (perkiraan)`);
          setOsrmRoute([]);
          return;
        }

        const data = JSON.parse(text);

        if (data?.routes?.length) {
          const coords: [number, number][] =
            data.routes[0].geometry.coordinates.map((c: [number, number]) => [
              c[1],
              c[0],
            ]);
          setOsrmRoute(coords);
          const durationSec = data.routes[0].duration;
          const minutes = Math.max(1, Math.round(durationSec / 60));
          setEta(`${minutes} menit`);
        } else {
          // fallback
          const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
          const minutes = Math.max(1, Math.round((km / 30) * 60));
          setEta(`${minutes} menit (perkiraan)`);
          setOsrmRoute([]);
        }
      } catch (err) {
        console.error("OSRM failed (exception)", err);
        const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
        const minutes = Math.max(1, Math.round((km / 30) * 60));
        setEta(`${minutes} menit (perkiraan)`);
        setOsrmRoute([]);
      }
    })();
  }, [
    order?.location?.latitude,
    order?.location?.longitude,
    order?.destination?.latitude,
    order?.destination?.longitude,
    order?.location, order?.destination
  ]);

  if (!order)
    return (
      <div style={{ padding: 20 }}>
        Order tidak ditemukan atau belum tersedia.
      </div>
    );

  return (
    <main style={{ padding: 18, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 10 }}>Lacak Pesanan</h1>
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        <div>
          <b>Order ID:</b> {orderId}
        </div>
        <div>
          <b>Customer:</b> {order.customerName}
        </div>
        <div>
          <b>Alamat:</b> {order.customerAddress}
        </div>
        <div>
          <b>Status:</b> {order.status}
        </div>
      </div>

      <TrackingMap
        courier={{
          lat: order.location.latitude,
          lng: order.location.longitude,
        }}
        destination={[order.destination.latitude, order.destination.longitude]}
        osrmRoute={osrmRoute}
        eta={eta}
      />
    </main>
  );
}
