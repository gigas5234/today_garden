import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FARM, farmAt } from "@/lib/farms";
import {
  completeTask,
  createFollowupTask,
  deleteTask,
  IssueType,
  listCrops,
  markIssueTask,
  ResultStatus,
  snoozeTask,
  toggleTask,
  type Task,
} from "@/lib/store/repo";
import { buildFollowupTask, plusDaysKst, TaskKind } from "@/lib/tasks/followup-rules";
import { buildSnapshot } from "@/lib/weather/normalize";

type ActionBody =
  | { action: "toggle"; done: boolean }
  | {
      action: "complete";
      result_status: ResultStatus;
      memo?: string;
      task_kind?: TaskKind;
      lat?: number;
      lon?: number;
      crop_id?: string | null;
      crop_name?: string | null;
      title?: string;
      generate_followup?: boolean; // 기본 true
    }
  | { action: "snooze"; due_at: string; reason?: string }
  | { action: "issue"; issue_type: IssueType; memo?: string };

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as ActionBody;

  // 하위호환: action 없이 done:boolean 만 보낸 경우 기존 toggle 동작
  // @ts-expect-error legacy body shape
  if (!body.action && typeof body.done === "boolean") {
    // @ts-expect-error legacy body shape
    await toggleTask(id, body.done);
    return NextResponse.json({ ok: true });
  }

  if (!("action" in body)) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  switch (body.action) {
    case "toggle": {
      await toggleTask(id, body.done);
      return NextResponse.json({ ok: true });
    }

    case "snooze": {
      const t = await snoozeTask({
        task_id: id,
        due_at: body.due_at,
        reason: body.reason,
      });
      return NextResponse.json({ task: t });
    }

    case "issue": {
      const t = await markIssueTask({
        task_id: id,
        issue_type: body.issue_type,
        memo: body.memo,
      });
      return NextResponse.json({ task: t });
    }

    case "complete": {
      // 1) 그 시점의 핵심 날씨 스냅샷 (영구 저장용)
      const farm =
        typeof body.lat === "number" && typeof body.lon === "number"
          ? farmAt(body.lat, body.lon)
          : DEFAULT_FARM;
      let weather: Record<string, unknown> | null = null;
      try {
        const snap = await buildSnapshot(farm);
        weather = {
          temp: snap.current.temp,
          feelsLike: snap.current.feelsLike,
          humidity: snap.current.humidity,
          windSpeed: snap.current.windSpeed,
          pop: snap.current.pop,
          sky: snap.current.sky,
          uv: snap.current.uv,
          pm10Label: snap.current.pm10Label,
          generatedAt: snap.meta.generatedAt,
        };
      } catch {
        /* ignore */
      }

      // 2) 완료 처리 + work_log 자동 생성
      const { task, log } = await completeTask({
        task_id: id,
        result_status: body.result_status,
        memo: body.memo,
        weather_snapshot: weather,
      });

      // 3) followup task 자동 생성 (룰 기반)
      let followup: Task | null = null;
      const wantFollowup = body.generate_followup !== false;
      if (wantFollowup && task) {
        // crop 이름 lookup (followup 라벨에 사용)
        let cropName: string | undefined;
        if (task.crop_id) {
          try {
            const crops = await listCrops(farm.id);
            cropName = crops.find((c) => c.id === task.crop_id)?.name;
          } catch {
            /* ignore */
          }
        }
        const fr = buildFollowupTask(
          task.title,
          (body.task_kind ?? task.task_kind) as TaskKind | null | undefined,
          cropName,
          body.result_status
        );
        if (fr) {
          followup = await createFollowupTask({
            source_task_id: id,
            farm_id: farm.id,
            crop_id: task.crop_id,
            title: fr.title,
            due_at: plusDaysKst(fr.days),
            rule_kind: fr.rule_kind,
            rule_days: fr.days,
          });
        }
      }

      return NextResponse.json({ task, log, followup });
    }
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
