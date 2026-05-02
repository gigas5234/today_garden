import { NextRequest, NextResponse } from "next/server";
import { createCrop, listCrops } from "@/lib/store/repo";

export async function GET() {
  const crops = await listCrops("main");
  return NextResponse.json({ crops });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const crop = await createCrop({
    farm_id: "main",
    name: String(body.name).slice(0, 60),
    variety: body.variety ?? null,
    planted_at: body.planted_at ?? null,
  });
  return NextResponse.json({ crop });
}
