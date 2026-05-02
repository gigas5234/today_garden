/**
 * 통합 데이터 레포 — Supabase 가 켜져 있으면 DB, 아니면 in-memory.
 * 단일 밭("main") 운영. 작물 / 할 일 / 사진 모두 같은 인터페이스.
 */

import { DEFAULT_FARM, FarmId } from "../farms";
import { getServerSupabase, SUPABASE_ENABLED } from "../supabase/server";

export type Priority = "high" | "mid" | "low";
export type TaskStatus = "pending" | "done" | "partial" | "snoozed" | "issue_found";
export type ResultStatus = "normal" | "partial" | "issue_found" | "needs_followup";
export type IssueType =
  | "pest"
  | "disease"
  | "drying_problem"
  | "growth_problem"
  | "weather_damage"
  | "other";

export type Task = {
  id: string;
  farm_id: FarmId;
  crop_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
  /** 0002 마이그레이션 후 사용. 미설정 시 done_at 으로 추정. */
  status?: TaskStatus;
  result_status?: ResultStatus | null;
  snooze_reason?: string | null;
  task_kind?: string | null;
  issue_type?: IssueType | null;
  memo?: string | null;
};

export type WorkLog = {
  id: string;
  task_id: string | null;
  farm_id: FarmId;
  crop_id: string | null;
  title: string;
  result_status: ResultStatus | null;
  memo: string | null;
  weather_snapshot: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
};

export type Crop = {
  id: string;
  farm_id: FarmId;
  name: string;
  variety: string | null;
  planted_at: string | null;
  expected_harvest_at: string | null;
  notes: string | null;
  created_at: string;
};

export type CropPhoto = {
  id: string;
  crop_id: string;
  storage_path: string;
  memo: string | null;
  taken_at: string | null;
  created_at: string;
};

/* ──────────────── in-memory 폴백 (Supabase 없을 때만 사용) ──────────────── */

const memCrops: Crop[] = [];
const memTasks: Task[] = [];
const memPhotos: CropPhoto[] = [];
const memWorkLogs: WorkLog[] = [];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

/* ──────────────── farm 매핑 (Supabase row ↔ FarmId) ──────────────── */

async function resolveFarmRowId(farm_id: FarmId): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data } = await sb.from("farms").select("id").eq("slug", farm_id).single();
  return data?.id ?? null;
}

// 단일 밭 모드 — 모든 row 는 "main" 으로 매핑
function farmIdFromRow(_rowId: string): FarmId {
  return "main";
}

/* ──────────────── tasks ──────────────── */

export async function listTasks(farm_id: FarmId): Promise<Task[]> {
  const sb = getServerSupabase();
  if (!sb) return memTasks.filter((t) => t.farm_id === farm_id);
  const farmRow = await resolveFarmRowId(farm_id);
  if (!farmRow) return [];
  const { data, error } = await sb
    .from("tasks")
    .select("id, farm_id, crop_id, title, description, priority, due_at, done_at, created_at")
    .eq("farm_id", farmRow)
    .order("done_at", { ascending: true })
    .order("priority")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    farm_id: farmIdFromRow(r.farm_id),
  })) as Task[];
}

export async function createTask(input: {
  farm_id: FarmId;
  crop_id?: string | null;
  title: string;
  description?: string | null;
  priority?: Priority;
}): Promise<Task> {
  const t: Task = {
    id: uid(),
    farm_id: input.farm_id,
    crop_id: input.crop_id ?? null,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? "mid",
    due_at: new Date().toISOString().slice(0, 10),
    done_at: null,
    created_at: new Date().toISOString(),
  };
  const sb = getServerSupabase();
  if (!sb) {
    memTasks.push(t);
    return t;
  }
  const farmRow = await resolveFarmRowId(input.farm_id);
  if (!farmRow) throw new Error("farm not found");
  const { data, error } = await sb
    .from("tasks")
    .insert({
      farm_id: farmRow,
      crop_id: t.crop_id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_at: t.due_at,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as Task), farm_id: input.farm_id };
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) {
    const t = memTasks.find((x) => x.id === id);
    if (t) {
      t.done_at = done ? new Date().toISOString() : null;
      t.status = done ? "done" : "pending";
    }
    return;
  }
  const updates: Record<string, unknown> = {
    done_at: done ? new Date().toISOString() : null,
  };
  // status 컬럼이 있으면 같이 업데이트 (0002 마이그레이션 후). 없으면 silently 무시되도록 try
  try {
    await sb.from("tasks").update({ ...updates, status: done ? "done" : "pending" }).eq("id", id);
    return;
  } catch {
    /* fallback */
  }
  const { error } = await sb.from("tasks").update(updates).eq("id", id);
  if (error) throw error;
}

/** 할 일 영구 삭제. */
export async function deleteTask(id: string): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) {
    const idx = memTasks.findIndex((t) => t.id === id);
    if (idx >= 0) memTasks.splice(idx, 1);
    return;
  }
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/* ──────────────── 작업 완료 / 미루기 / 문제 발견 (확장) ──────────────── */

export type CompleteTaskInput = {
  task_id: string;
  result_status: ResultStatus;
  memo?: string | null;
  /** WorkLog 의 weather_snapshot 으로 저장될 핵심 수치들 */
  weather_snapshot?: Record<string, unknown> | null;
};

export type SnoozeTaskInput = {
  task_id: string;
  due_at: string;        // YYYY-MM-DD
  reason?: string | null;
};

export type IssueTaskInput = {
  task_id: string;
  issue_type: IssueType;
  memo?: string | null;
};

/** 완료 처리 — task 상태 변경 + work_log row 생성. 결과 row 들 반환. */
export async function completeTask(
  input: CompleteTaskInput
): Promise<{ task: Task | null; log: WorkLog | null }> {
  const sb = getServerSupabase();
  const nowIso = new Date().toISOString();

  if (!sb) {
    const t = memTasks.find((x) => x.id === input.task_id);
    if (!t) return { task: null, log: null };
    t.done_at = nowIso;
    t.status = input.result_status === "partial" ? "partial" : "done";
    t.result_status = input.result_status;
    if (input.memo) t.memo = input.memo;
    const log: WorkLog = {
      id: uid(),
      task_id: t.id,
      farm_id: t.farm_id,
      crop_id: t.crop_id,
      title: t.title,
      result_status: input.result_status,
      memo: input.memo ?? null,
      weather_snapshot: input.weather_snapshot ?? null,
      occurred_at: nowIso,
      created_at: nowIso,
    };
    memWorkLogs.push(log);
    return { task: t, log };
  }

  // Supabase 모드 — 신규 컬럼이 없을 수 있으므로 단계적으로 시도
  let updatedTask: Task | null = null;
  try {
    const { data } = await sb
      .from("tasks")
      .update({
        done_at: nowIso,
        status: input.result_status === "partial" ? "partial" : "done",
        result_status: input.result_status,
        memo: input.memo ?? null,
      })
      .eq("id", input.task_id)
      .select()
      .single();
    updatedTask = data as Task;
  } catch {
    // 신규 컬럼 미존재 — done_at 만 업데이트
    const { data } = await sb
      .from("tasks")
      .update({ done_at: nowIso })
      .eq("id", input.task_id)
      .select()
      .single();
    updatedTask = data as Task;
  }

  let logRow: WorkLog | null = null;
  if (updatedTask) {
    try {
      const farmRow = await resolveFarmRowId("main");
      const { data } = await sb
        .from("work_logs")
        .insert({
          task_id: updatedTask.id,
          farm_id: farmRow,
          crop_id: updatedTask.crop_id,
          title: updatedTask.title,
          result_status: input.result_status,
          memo: input.memo ?? null,
          weather_snapshot: input.weather_snapshot ?? null,
          occurred_at: nowIso,
        })
        .select()
        .single();
      logRow = data as WorkLog;
    } catch {
      /* work_logs 테이블 미생성 — 무시 */
    }
  }

  return {
    task: updatedTask ? { ...updatedTask, farm_id: "main" } : null,
    log: logRow,
  };
}

/** 미루기 — due_at 변경 + status snoozed. */
export async function snoozeTask(input: SnoozeTaskInput): Promise<Task | null> {
  const sb = getServerSupabase();
  if (!sb) {
    const t = memTasks.find((x) => x.id === input.task_id);
    if (!t) return null;
    t.due_at = input.due_at;
    t.status = "snoozed";
    if (input.reason) t.snooze_reason = input.reason;
    return t;
  }
  try {
    const { data } = await sb
      .from("tasks")
      .update({
        due_at: input.due_at,
        status: "snoozed",
        snooze_reason: input.reason ?? null,
      })
      .eq("id", input.task_id)
      .select()
      .single();
    return data ? { ...(data as Task), farm_id: "main" } : null;
  } catch {
    const { data } = await sb
      .from("tasks")
      .update({ due_at: input.due_at })
      .eq("id", input.task_id)
      .select()
      .single();
    return data ? { ...(data as Task), farm_id: "main" } : null;
  }
}

/** 문제 발견 — issue_type 저장 + status issue_found. */
export async function markIssueTask(input: IssueTaskInput): Promise<Task | null> {
  const sb = getServerSupabase();
  if (!sb) {
    const t = memTasks.find((x) => x.id === input.task_id);
    if (!t) return null;
    t.status = "issue_found";
    t.result_status = "issue_found";
    t.issue_type = input.issue_type;
    if (input.memo) t.memo = input.memo;
    return t;
  }
  try {
    const { data } = await sb
      .from("tasks")
      .update({
        status: "issue_found",
        result_status: "issue_found",
        issue_type: input.issue_type,
        memo: input.memo ?? null,
      })
      .eq("id", input.task_id)
      .select()
      .single();
    return data ? { ...(data as Task), farm_id: "main" } : null;
  } catch {
    return null;
  }
}

/** 자동 followup task 생성 — 룰 기반 (방제→7일, 수확→2일, 등). */
export async function createFollowupTask(input: {
  source_task_id: string;
  farm_id: FarmId;
  crop_id: string | null;
  title: string;
  due_at: string;
  rule_kind: string;
  rule_days: number;
}): Promise<Task | null> {
  const sb = getServerSupabase();
  const nowIso = new Date().toISOString();
  const t: Task = {
    id: uid(),
    farm_id: input.farm_id,
    crop_id: input.crop_id,
    title: input.title,
    description: null,
    priority: "mid",
    due_at: input.due_at,
    done_at: null,
    created_at: nowIso,
    task_kind: input.rule_kind,
    status: "pending",
  };

  if (!sb) {
    memTasks.push(t);
    return t;
  }

  const farmRow = await resolveFarmRowId(input.farm_id);
  if (!farmRow) return null;

  let nextTaskId: string | null = null;
  try {
    const { data } = await sb
      .from("tasks")
      .insert({
        farm_id: farmRow,
        crop_id: input.crop_id,
        title: input.title,
        priority: "mid",
        due_at: input.due_at,
        task_kind: input.rule_kind,
        status: "pending",
      })
      .select()
      .single();
    nextTaskId = data?.id ?? null;
  } catch {
    const { data } = await sb
      .from("tasks")
      .insert({
        farm_id: farmRow,
        crop_id: input.crop_id,
        title: input.title,
        priority: "mid",
        due_at: input.due_at,
      })
      .select()
      .single();
    nextTaskId = data?.id ?? null;
  }

  if (nextTaskId) {
    try {
      await sb.from("task_followups").insert({
        source_task_id: input.source_task_id,
        next_task_id: nextTaskId,
        rule_kind: input.rule_kind,
        rule_days: input.rule_days,
      });
    } catch {
      /* task_followups 미생성 — 무시 */
    }
  }

  return nextTaskId ? { ...t, id: nextTaskId } : null;
}

/* ──────────────── crops ──────────────── */

export async function listCrops(farm_id: FarmId): Promise<Crop[]> {
  const sb = getServerSupabase();
  if (!sb) return memCrops.filter((c) => c.farm_id === farm_id);
  const farmRow = await resolveFarmRowId(farm_id);
  if (!farmRow) return [];
  const { data, error } = await sb
    .from("crops")
    .select("*")
    .eq("farm_id", farmRow)
    .is("archived_at", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r as Crop), farm_id }));
}

export async function createCrop(input: {
  farm_id: FarmId;
  name: string;
  variety?: string | null;
  planted_at?: string | null;
}): Promise<Crop> {
  const c: Crop = {
    id: uid(),
    farm_id: input.farm_id,
    name: input.name,
    variety: input.variety ?? null,
    planted_at: input.planted_at ?? null,
    expected_harvest_at: null,
    notes: null,
    created_at: new Date().toISOString(),
  };
  const sb = getServerSupabase();
  if (!sb) {
    memCrops.push(c);
    return c;
  }
  const farmRow = await resolveFarmRowId(input.farm_id);
  if (!farmRow) throw new Error("farm not found");
  const { data, error } = await sb
    .from("crops")
    .insert({
      farm_id: farmRow,
      name: c.name,
      variety: c.variety,
      planted_at: c.planted_at,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as Crop), farm_id: input.farm_id };
}

export async function deleteCrop(id: string): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) {
    const idx = memCrops.findIndex((c) => c.id === id);
    if (idx >= 0) memCrops.splice(idx, 1);
    return;
  }
  const { error } = await sb.from("crops").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/* ──────────────── photos ──────────────── */

export async function listPhotos(crop_id: string): Promise<CropPhoto[]> {
  const sb = getServerSupabase();
  if (!sb) return memPhotos.filter((p) => p.crop_id === crop_id);
  const { data, error } = await sb
    .from("crop_photos")
    .select("*")
    .eq("crop_id", crop_id)
    .order("taken_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CropPhoto[];
}

export async function recordPhoto(input: {
  crop_id: string;
  storage_path: string;
  memo?: string | null;
}): Promise<CropPhoto> {
  const p: CropPhoto = {
    id: uid(),
    crop_id: input.crop_id,
    storage_path: input.storage_path,
    memo: input.memo ?? null,
    taken_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  const sb = getServerSupabase();
  if (!sb) {
    memPhotos.push(p);
    return p;
  }
  const { data, error } = await sb
    .from("crop_photos")
    .insert({
      crop_id: input.crop_id,
      storage_path: input.storage_path,
      memo: p.memo,
      taken_at: p.taken_at,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CropPhoto;
}

export async function signedUploadUrl(crop_id: string, filename: string): Promise<{
  uploadUrl: string;
  storage_path: string;
  publicUrl?: string;
} | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const path = `${crop_id}/${Date.now()}_${filename.replace(/[^\w.\-]/g, "_")}`;
  const { data, error } = await sb.storage.from("crop-photos").createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("signedUrl failed");
  return { uploadUrl: data.signedUrl, storage_path: path };
}

export const REPO_USES_SUPABASE = SUPABASE_ENABLED;

export function defaultFarm() {
  return DEFAULT_FARM;
}
