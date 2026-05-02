"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import {
  IconLeaf,
  IconChevLeft,
  IconPlus,
  IconCheck,
  CropChip,
} from "@/components/icons";
import type { Crop, Task } from "@/lib/store/repo";

export default function SettingsPage() {
  const router = useRouter();

  const [crops, setCrops] = React.useState<Crop[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [cropName, setCropName] = React.useState("");
  const [cropVariety, setCropVariety] = React.useState("");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskCropId, setTaskCropId] = React.useState<string>("");
  const [taskPriority, setTaskPriority] = React.useState<"high" | "mid" | "low">("mid");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    const [c, t] = await Promise.all([
      fetch(`/api/crops`).then((r) => r.json()),
      fetch(`/api/tasks`).then((r) => r.json()),
    ]);
    setCrops(c.crops ?? []);
    setTasks(t.tasks ?? []);
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const addCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim()) return;
    setBusy(true);
    await fetch(`/api/crops`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: cropName.trim(),
        variety: cropVariety.trim() || null,
      }),
    });
    setCropName("");
    setCropVariety("");
    await reload();
    setBusy(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setBusy(true);
    await fetch(`/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        crop_id: taskCropId || null,
        title: taskTitle.trim(),
        priority: taskPriority,
      }),
    });
    setTaskTitle("");
    setTaskCropId("");
    setTaskPriority("mid");
    await reload();
    setBusy(false);
  };

  const removeCrop = async (id: string) => {
    if (!confirm("이 작물을 삭제할까요? 연결된 할 일은 남습니다.")) return;
    await fetch(`/api/crops/${id}`, { method: "DELETE" });
    reload();
  };

  return (
    <div className="screen-anim">
      <TopBar
        rightSlot={
          <button className="icon-btn" aria-label="뒤로" onClick={() => router.back()}>
            <IconChevLeft size={22} />
          </button>
        }
      />

      <h1 className="page-title">
        설정 <IconLeaf size={28} />
      </h1>

      {/* 작물 ─────────────────────────────────────────────── */}
      <div className="section-h">
        <span>작물 ({crops.length}개)</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {crops.map((c) => (
          <div
            key={c.id}
            className="card-flat fade-up"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <CropChip name={c.name} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                {c.variety || "품종 미입력"}
              </div>
            </div>
            <button
              onClick={() => removeCrop(c.id)}
              style={{
                color: "var(--ink-500)",
                fontSize: 13,
                padding: "6px 10px",
                border: "1px solid var(--line)",
                borderRadius: 999,
              }}
            >
              삭제
            </button>
          </div>
        ))}

        <form
          onSubmit={addCrop}
          className="card-flat fade-up"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-900)" }}>
            새 작물 추가
          </div>
          <input
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            placeholder="작물 이름 (예: 고추)"
            style={inputStyle}
          />
          <input
            value={cropVariety}
            onChange={(e) => setCropVariety(e.target.value)}
            placeholder="품종 (선택, 예: 청양)"
            style={inputStyle}
          />
          <button type="submit" disabled={busy || !cropName.trim()} style={primaryBtn(!cropName.trim())}>
            <IconPlus size={16} /> 추가
          </button>
        </form>
      </div>

      {/* 할 일 ─────────────────────────────────────────────── */}
      <div className="section-h" style={{ marginTop: 28 }}>
        <span>할 일 ({tasks.length}개)</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((t) => (
          <div
            key={t.id}
            className="card-flat fade-up"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            {t.done_at && <IconCheck size={16} color="#2A6347" stroke={3} />}
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{t.title}</div>
            <span className={"chip " + (t.priority === "high" ? "warn" : "ok")} style={{ fontSize: 11 }}>
              {t.priority === "high" ? "높음" : t.priority === "low" ? "낮음" : "보통"}
            </span>
          </div>
        ))}

        <form
          onSubmit={addTask}
          className="card-flat fade-up"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-900)" }}>
            새 할 일 추가
          </div>
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="할 일 (예: 토마토 곁순 따기)"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={taskCropId}
              onChange={(e) => setTaskCropId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">작물 선택 (선택)</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as "high" | "mid" | "low")}
              style={{ ...inputStyle, width: 100 }}
            >
              <option value="high">높음</option>
              <option value="mid">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          <button type="submit" disabled={busy || !taskTitle.trim()} style={primaryBtn(!taskTitle.trim())}>
            <IconPlus size={16} /> 추가
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          background: "var(--bg-soft)",
          borderRadius: 12,
          fontSize: 12,
          color: "var(--ink-500)",
          lineHeight: 1.6,
        }}
      >
        💡 Supabase 키가 설정되지 않으면 데이터는 서버 메모리에 저장됩니다.
        <br />
        개발 서버 재시작 시 초기 시드로 돌아갑니다.
        <br />
        영구 저장이 필요하면 .env.local 의 SUPABASE_* 를 채우고 마이그레이션을 실행하세요.
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 15,
  fontFamily: "inherit",
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  color: "var(--ink-900)",
  outline: "none",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    background: disabled ? "var(--ink-300)" : "var(--green-800)",
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
