import { NextRequest, NextResponse } from "next/server";
import { deleteCrop } from "@/lib/store/repo";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await deleteCrop(id);
  return NextResponse.json({ ok: true });
}
