// app/api/osrm/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "OSRM proxy OK (GET)" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to } = body ?? {};

    if (
      !from || !to ||
      typeof from.lat !== "number" || typeof from.lng !== "number" ||
      typeof to.lat !== "number" || typeof to.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "invalid_body", message: "body must include from:{lat,lng} and to:{lat,lng}" },
        { status: 400 }
      );
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const r = await fetch(osrmUrl);
    const text = await r.text();

    if (!r.ok) {
      return NextResponse.json(
        { error: "osrm_error", status: r.status, details: text },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "invalid_osrm_response", details: text }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: "internal", message: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "internal", message: String(err) }, { status: 500 });
  }
}

