"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import TrackingMap from "@/components/TrackingMap";
import { db } from "@/lib/firebease";

export default function Page() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<any>(null);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder(snap.data());
      else setOrder(null);
    });
    return () => unsub();
  }, [orderId]);

  // When order.location changes, fetch OSRM route from /api/osrm/route
  useEffect(() => {
    if (!order?.location || !order?.destination) return;

    const from = { lat: order.location.lat, lng: order.location.lng };
    const to = { lat: order.destination.lat, lng: order.destination.lng };

    (async () => {
      try {
        const res = await fetch("/api/osrm/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        const data = await res.json();
        if (data?.routes?.length) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
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
    order?.location?.lat,
    order?.location?.lng,
    order?.destination?.lat,
    order?.destination?.lng,
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
          lat: order.location?.lat ?? 0,
          lng: order.location?.lng ?? 0,
        }}
        destination={[order.destination.lat, order.destination.lng]}
        osrmRoute={osrmRoute}
        eta={eta ?? undefined}
      />
    </main>
  );
}
