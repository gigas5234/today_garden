/**
 * 통합 데이터 레포 — Supabase 가 켜져 있으면 DB, 아니면 in-memory.
 * 단일 밭("main") 운영. 작물 / 할 일 / 사진 모두 같은 인터페이스.
 */

import { DEFAULT_FARM, FarmId } from "../farms";
import { getServerSupabase, SUPABASE_ENABLED } from "../supabase/server";

export type Priority = "high" | "mid" | "low";

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

async function farmIdFromRow(rowId: string): Promise<FarmId> {
  const sb = getServerSupabase();
  if (!sb) return "ypg";
  const { data } = await sb.from("farms").select("slug").eq("id", rowId).single();
  return ((data?.slug as FarmId) ?? "ypg") as FarmId;
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
  return await Promise.all(
    (data ?? []).map(async (r) => ({
      ...r,
      farm_id: await farmIdFromRow(r.farm_id),
    })) as Task[]
  );
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
    if (t) t.done_at = done ? new Date().toISOString() : null;
    return;
  }
  const { error } = await sb
    .from("tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
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
