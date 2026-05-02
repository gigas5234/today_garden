import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FARM, farmAt } from "@/lib/farms";
import { buildSnapshot } from "@/lib/weather/normalize";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const latS = sp.get("lat");
  const lonS = sp.get("lon");
  const farm =
    latS && lonS ? farmAt(Number(latS), Number(lonS)) : DEFAULT_FARM;
  const snap = await buildSnapshot(farm);

  return NextResponse.json(
    {
      farm: { id: farm.id, name: farm.name, lat: farm.lat, lon: farm.lon },
      generatedAt: snap.meta.generatedAt,
      score: snap.score,
      hourly: snap.hourly.map((h) => ({ time: h.time, status: h.status, isNow: h.isNow })),
      current: {
        feelsLike: snap.current.feelsLike,
        humidity: snap.current.humidity,
        windSpeed: snap.current.windSpeed,
        pop: snap.current.pop,
        uv: snap.current.uv,
        pm10: snap.current.pm10,
        pm10Label: snap.current.pm10Label,
      },
    },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
