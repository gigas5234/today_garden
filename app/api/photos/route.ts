import { NextRequest, NextResponse } from "next/server";
import { listPhotos, recordPhoto } from "@/lib/store/repo";

export async function GET(req: NextRequest) {
  const crop_id = req.nextUrl.searchParams.get("crop_id");
  if (!crop_id) return NextResponse.json({ error: "crop_id required" }, { status: 400 });
  const photos = await listPhotos(crop_id);
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const { crop_id, storage_path, memo } = await req.json();
  if (!crop_id || !storage_path) {
    return NextResponse.json({ error: "crop_id, storage_path required" }, { status: 400 });
  }
  const photo = await recordPhoto({ crop_id, storage_path, memo });
  return NextResponse.json({ photo });
}
