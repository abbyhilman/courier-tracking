// app/api/osrm/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { from, to } = await req.json(); // { from: {lat, lng}, to: {lat, lng} }

    // OSRM public endpoint (driving)
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "failed", details: String(err) }, { status: 500 });
  }
}
