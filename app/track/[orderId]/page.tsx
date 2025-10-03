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

// Komponen Shimmer Skeleton untuk loading state
const ShimmerSkeleton = () => (
  <>
    <style jsx>{`
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      .shimmer {
        background: linear-gradient(
          90deg,
          #f0f0f0 25%,
          #e0e0e0 50%,
          #f0f0f0 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite linear;
        border-radius: 4px;
      }
      .shimmer-line {
        height: 16px;
        margin-bottom: 12px;
      }
      .shimmer-box {
        height: 400px;
        border-radius: 8px;
      }
    `}</style>
    <main style={{ padding: 18, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header placeholder */}
      <div
        className="shimmer shimmer-line"
        style={{ width: "200px", height: "24px", marginBottom: 20 }}
      ></div>
      
      {/* Info box placeholder */}
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        <div className="shimmer shimmer-line" style={{ width: "100%" }}></div>
        <div className="shimmer shimmer-line" style={{ width: "80%" }}></div>
        <div className="shimmer shimmer-line" style={{ width: "90%" }}></div>
        <div className="shimmer shimmer-line" style={{ width: "70%" }}></div>
      </div>

      {/* Map placeholder */}
      <div className="shimmer shimmer-box"></div>
    </main>
  </>
);

// Komponen Not Found dengan animasi sederhana (fade-in)
const NotFoundMessage = () => (
  <div
    style={{
      padding: 40,
      textAlign: "center",
      maxWidth: 1000,
      margin: "0 auto",
      opacity: 0,
      animation: "fadeIn 0.8s ease-in-out forwards",
    }}
  >
    <style jsx>{`
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
    <h2 style={{ color: "#666", marginBottom: 10 }}>Order Tidak Ditemukan</h2>
    <p style={{ color: "#999" }}>Pesanan dengan ID ini tidak ditemukan atau belum tersedia. Pastikan ID order benar dan coba lagi nanti.</p>
  </div>
);

export default function Page() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        setOrder(snap.data() as Order);
      } else {
        setOrder(null);
      }
      // Set loading false setelah snapshot pertama (baik data ada atau tidak)
      setIsLoading(false);
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
    order?.location,
    order?.destination,
  ]);

  // Loading state dengan shimmer animation
  if (isLoading) {
    return <ShimmerSkeleton />;
  }

  // Not found state dengan fade-in animation
  if (!order) {
    return <NotFoundMessage />;
  }

  // Main content dengan fade-in animation sederhana
  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1000,
        margin: "0 auto",
        opacity: 0,
        animation: "contentFadeIn 0.5s ease-in-out forwards",
      }}
    >
      <style jsx>{`
        @keyframes contentFadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <h1 style={{ marginBottom: 10 }}>Lacak Pesanan</h1>
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Tambahan untuk UX lebih baik
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