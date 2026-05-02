import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FARM, farmAt } from "@/lib/farms";
import { buildSnapshot } from "@/lib/weather/normalize";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const latS = sp.get("lat");
  const lonS = sp.get("lon");
  const farm =
    latS && lonS && !Number.isNaN(Number(latS)) && !Number.isNaN(Number(lonS))
      ? farmAt(Number(latS), Number(lonS))
      : DEFAULT_FARM;
  const snap = await buildSnapshot(farm);
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
