import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/store/repo";

export async function GET() {
  const tasks = await listTasks("main");
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const task = await createTask({
    farm_id: "main",
    crop_id: body.crop_id ?? null,
    title: String(body.title).slice(0, 200),
    description: body.description ?? null,
    priority: body.priority ?? "mid",
  });
  return NextResponse.json({ task });
}
