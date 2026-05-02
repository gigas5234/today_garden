import { NextRequest, NextResponse } from "next/server";
import { toggleTask } from "@/lib/store/repo";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json();
  if (typeof body.done !== "boolean") {
    return NextResponse.json({ error: "done:boolean required" }, { status: 400 });
  }
  await toggleTask(id, body.done);
  return NextResponse.json({ ok: true });
}
