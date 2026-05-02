"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import {
  IconFilter,
  IconLeaf,
  IconDrop,
  IconWind,
  IconUV,
  IconClipboard,
  IconCheck,
  IconClock,
  IconBell,
  IconArrowUp,
  IconBot,
  IconChevRight,
  CropChip,
} from "@/components/icons";
import { useLocation } from "@/components/LocationContext";
import { useWeather } from "@/components/useWeather";
import { TaskBottomSheet } from "@/components/tasks/TaskBottomSheet";
import type { Task as RepoTask, Crop } from "@/lib/store/repo";

type Priority = "high" | "mid" | "low";

const PRI_LABEL: Record<Priority, string> = { high: "높음", mid: "보통", low: "낮음" };
const PRI_CLASS: Record<Priority, string> = { high: "warn", mid: "ok", low: "ok" };

function timeLabel(t: RepoTask): string {
  if (t.done_at) {
    const d = new Date(t.done_at);
    return `완료 · ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return t.priority === "high" ? "오전 중 권장" : "오늘 중";
}

export default function TasksPage() {
  const router = useRouter();
  const { farm } = useLocation();
  const { snap } = useWeather(farm.lat, farm.lon);
  const cur = snap?.current;

  const [tasks, setTasks] = React.useState<RepoTask[]>([]);
  const [crops, setCrops] = React.useState<Map<string, Crop>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [confetti, setConfetti] = React.useState<string | null>(null);
  const [sheetTask, setSheetTask] = React.useState<RepoTask | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      fetch(`/api/tasks`).then((r) => r.json()),
      fetch(`/api/crops`).then((r) => r.json()),
    ]);
    setTasks(tRes.tasks ?? []);
    const cropMap = new Map<string, Crop>();
    for (const c of cRes.crops ?? []) cropMap.set(c.id, c);
    setCrops(cropMap);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const todoCount = tasks.filter((t) => !t.done_at).length;
  const doneCount = tasks.filter((t) => t.done_at).length;

  /** 체크박스 토글 — 빠른 완료 처리 (확장 액션 시트 안 거치고). */
  const quickComplete = async (e: React.MouseEvent, t: RepoTask) => {
    e.stopPropagation();
    const willDone = !t.done_at;
    if (willDone) {
      setConfetti(t.id);
      setTimeout(() => setConfetti(null), 700);
    }
    setTasks((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, done_at: willDone ? new Date().toISOString() : null } : x
      )
    );
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        willDone
          ? { action: "complete", result_status: "normal" }
          : { action: "toggle", done: false }
      ),
    });
    if (willDone) reload();
  };

  const openSheet = (t: RepoTask) => {
    if (t.done_at) return; // 완료된 task 는 시트 안 열음
    setSheetTask(t);
  };

  const goAI = () => {
    router.push("/chat?initial=" + encodeURIComponent("오늘 어떤 작업부터 하는 게 좋을까?"));
  };

  return (
    <div className="screen-anim">
      <TopBar
        rightSlot={
          <button className="icon-btn" aria-label="필터" onClick={() => router.push("/settings")}>
            <IconFilter size={20} />
          </button>
        }
      />

      <h1 className="page-title">
        오늘의 할 일 <IconLeaf size={28} />
      </h1>

      <div className="stat-strip fade-up">
        <div className="stat-cell">
          <div className="stat-icon todo">
            <IconClipboard size={22} />
          </div>
          <div className="stat-text">
            <div className="l">오늘 할 일</div>
            <div className="v">{todoCount}건</div>
          </div>
        </div>
        <div className="divider" />
        <div className="stat-cell">
          <div className="stat-icon done">
            <IconCheck size={22} color="#1F4D3A" stroke={3} />
          </div>
          <div className="stat-text">
            <div className="l">완료</div>
            <div className="v">{doneCount}건</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {!loading && tasks.length === 0 && (
          <div
            className="card-flat fade-up"
            style={{ textAlign: "center", padding: 24, color: "var(--ink-500)" }}
          >
            아직 할 일이 없어요.
            <br />
            <button
              onClick={() => router.push("/settings")}
              style={{
                marginTop: 12,
                color: "var(--green-800)",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              설정에서 추가하기
            </button>
          </div>
        )}
        {tasks.map((t, i) => {
          const cropName = t.crop_id ? crops.get(t.crop_id)?.name ?? "작물" : "밭 전체";
          const pri = (t.priority as Priority) ?? "mid";
          const done = !!t.done_at;
          return (
            <div
              key={t.id}
              className={"task-row fade-up" + (done ? " done" : "")}
              style={{ animationDelay: `${i * 60}ms`, cursor: done ? "default" : "pointer" }}
              onClick={() => openSheet(t)}
              role={done ? undefined : "button"}
            >
              <button
                className={"checkbox" + (done ? " checked" : "")}
                onClick={(e) => quickComplete(e, t)}
                aria-label={done ? "완료 취소" : "완료"}
              >
                {done && <IconCheck size={18} stroke={3.5} />}
              </button>

              {confetti === t.id && (
                <div style={{ position: "absolute", top: 22, left: 22, pointerEvents: "none" }}>
                  {Array.from({ length: 8 }).map((_, k) => {
                    const ang = (k / 8) * Math.PI * 2;
                    const cx = Math.cos(ang) * 28;
                    const cy = Math.sin(ang) * 28;
                    const cols = ["#3A7C58", "#E89B3C", "#7FB287", "#F0B441"];
                    return (
                      <span
                        key={k}
                        style={
                          {
                            position: "absolute",
                            width: 6,
                            height: 6,
                            borderRadius: 2,
                            background: cols[k % 4],
                            animation: "confetti .6s ease-out forwards",
                            ["--cx" as never]: `${cx}px`,
                            ["--cy" as never]: `${cy}px`,
                          } as React.CSSProperties
                        }
                      />
                    );
                  })}
                </div>
              )}

              <div className="task-meta">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <CropChip name={cropName} />
                  {!done && (
                    <span className={"chip " + PRI_CLASS[pri]}>
                      {PRI_LABEL[pri]}
                      {pri === "high" && <IconArrowUp size={12} stroke={3} />}
                      {pri !== "high" && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "currentColor",
                          }}
                        />
                      )}
                    </span>
                  )}
                </div>
                <div className="task-title">{t.title}</div>
                <div className={"task-time" + (done ? " done-time" : "")}>
                  {done ? (
                    <IconCheck size={16} color="#2A6347" stroke={2.6} />
                  ) : (
                    <IconClock size={16} />
                  )}
                  <span>{timeLabel(t)}</span>
                </div>
                {t.description && <div className="task-desc">{t.description}</div>}
              </div>

              {!done && (
                <IconChevRight
                  size={18}
                  stroke={2.4}
                  style={{ color: "var(--ink-400)", flexShrink: 0, marginTop: 24 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <TaskBottomSheet
        task={sheetTask}
        cropName={
          sheetTask?.crop_id ? crops.get(sheetTask.crop_id)?.name : undefined
        }
        onClose={() => setSheetTask(null)}
        onChanged={reload}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 22,
          marginBottom: 10,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink-700)",
        }}
      >
        <IconBell size={16} /> <span>오늘 리마인더</span>
      </div>
      <div className="reminder-row">
        {cur && (
          <>
            <span className="reminder-pill">
              <IconDrop size={14} color="#5A8BB5" /> 습도 {cur.humidity}%
            </span>
            <span className="reminder-pill">
              <IconUV size={14} /> UV {cur.uvLabel}
            </span>
            <span className="reminder-pill">
              <IconLeaf size={14} />{" "}
              {cur.windSpeed <= 3
                ? "바람 약함"
                : cur.windSpeed <= 7
                  ? "바람 보통"
                  : "바람 강함"}
            </span>
            <span className="reminder-pill">
              <IconWind size={14} /> 풍속 {cur.windSpeed}m/s
            </span>
          </>
        )}
      </div>

      <div
        className="ai-banner fade-up"
        style={{ marginTop: 18, animationDelay: "300ms", cursor: "pointer" }}
        onClick={goAI}
      >
        <div className="ai-bot">
          <IconBot size={30} />
        </div>
        <div className="ai-body">
          <div className="ai-t">AI에게 우선순위 물어보기</div>
          <div className="ai-s">오늘 가장 중요한 작업을 추천해드려요</div>
        </div>
        <button className="ai-go" aria-label="AI로 이동">
          <IconChevRight size={20} stroke={2.6} />
        </button>
      </div>
    </div>
  );
}
