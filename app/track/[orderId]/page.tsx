"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, GeoPoint } from "firebase/firestore";
import TrackingMap from "@/components/TrackingMap";
import { db } from "@/lib/firebease";

// Definisi Order sesuai Firestore
export interface Order {
  customerName: string;
  customerAddress: string;
  status: string;
  location: GeoPoint;     // Firestore GeoPoint
  destination: GeoPoint;  // Firestore GeoPoint
}

export default function Page() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<string | undefined>(undefined);

  // Ambil data order realtime dari Firestore
  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        setOrder(snap.data() as Order);
      } else {
        setOrder(null);
      }
    });

    return () => unsub();
  }, [orderId]);

  // Hitung rute dan ETA kalau lokasi/destinasi berubah
  useEffect(() => {
    if (!order?.location || !order?.destination) return;

    // NOTE: GeoPoint pakai .latitude & .longitude
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
        const res = await fetch("/api/osrm/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });

        const data = await res.json();

        if (data?.routes?.length) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setOsrmRoute(coords);

          const durationSec = data.routes[0].duration;
          const minutes = Math.max(1, Math.round(durationSec / 60));
          setEta(`${minutes} menit`);
        }
      } catch (e) {
        console.error("OSRM failed", e);
      }
    })();
  }, [
    order?.location?.latitude,
    order?.location?.longitude,
    order?.destination?.latitude,
    order?.destination?.longitude,
  ]);

  if (!order) {
    return (
      <div style={{ padding: 20 }}>
        Order tidak ditemukan atau belum tersedia.
      </div>
    );
  }

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
        destination={[
          order.destination.latitude,
          order.destination.longitude,
        ]}
        osrmRoute={osrmRoute}
        eta={eta}
      />
    </main>
  );
}
