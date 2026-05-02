"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useLocation } from "@/components/LocationContext";
import {
  IconCheck,
  IconClock,
  IconChevRight,
  IconBot,
} from "@/components/icons";
import type { Task, IssueType, ResultStatus } from "@/lib/store/repo";

type Props = {
  task: Task | null;
  cropName?: string;
  onClose: () => void;
  onChanged: () => void; // 액션 후 부모가 reload 호출
};

const ISSUE_TYPES: { key: IssueType; label: string }[] = [
  { key: "pest", label: "해충" },
  { key: "disease", label: "병" },
  { key: "drying_problem", label: "건조 문제" },
  { key: "growth_problem", label: "생육 부진" },
  { key: "weather_damage", label: "날씨 피해" },
  { key: "other", label: "기타" },
];

const SNOOZE_PRESETS: { label: string; days: number }[] = [
  { label: "내일", days: 1 },
  { label: "모레", days: 2 },
  { label: "+3일", days: 3 },
  { label: "+7일", days: 7 },
];

function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type Mode = "menu" | "issue" | "snooze";

export function TaskBottomSheet({ task, cropName, onClose, onChanged }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { farm } = useLocation();
  const [mode, setMode] = React.useState<Mode>("menu");
  const [memo, setMemo] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // SSR/hydration mismatch 방지 — mount 후에만 portal 활성
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (task) {
      setMode("menu");
      setMemo("");
    }
  }, [task?.id]);

  if (!task || !mounted) return null;

  const closeAll = () => {
    setMode("menu");
    setMemo("");
    onClose();
  };

  const callApi = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data;
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async (result: ResultStatus) => {
    const data = await callApi({
      action: "complete",
      result_status: result,
      memo: memo.trim() || undefined,
      lat: farm.lat,
      lon: farm.lon,
      crop_id: task.crop_id,
      crop_name: cropName,
      title: task.title,
    });
    let msg = "기록으로 저장됨";
    if (data?.followup?.title) msg += ` · ${data.followup.title} 알림 추가됨`;
    toast.show(msg, "success");
    onChanged();
    closeAll();
  };

  const onSnooze = async (days: number) => {
    await callApi({
      action: "snooze",
      due_at: plusDays(days),
      reason: memo.trim() || undefined,
    });
    toast.show(`${days === 1 ? "내일" : `+${days}일`} 로 미뤘어요`, "info");
    onChanged();
    closeAll();
  };

  const onIssue = async (issue_type: IssueType) => {
    await callApi({
      action: "issue",
      issue_type,
      memo: memo.trim() || undefined,
    });
    toast.show("문제로 표시 + 내일 재확인 알림 생성", "warn");
    onChanged();
    closeAll();
  };

  const onAskAI = () => {
    const q = `${task.title} 관련해서 상담해 줘${memo.trim() ? `: ${memo.trim()}` : ""}`;
    router.push("/chat?initial=" + encodeURIComponent(q));
    closeAll();
  };

  const onDelete = async () => {
    if (!confirm(`"${task.title}" 할 일을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast.show("할 일을 삭제했어요", "info");
      onChanged();
      closeAll();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <>
      <div className="bs-backdrop" onClick={closeAll} />
      <div className="bs-sheet" role="dialog" aria-modal="true">
        <div className="bs-handle" />

        <div className="bs-head">
          <div className="bs-task-title">{task.title}</div>
          {task.description && <div className="bs-task-desc">{task.description}</div>}
          <div className="bs-task-meta">
            {cropName && <span className="tag">{cropName}</span>}
            {task.due_at && (
              <span className="bs-due">
                <IconClock size={12} /> {task.due_at}
              </span>
            )}
          </div>
        </div>

        {mode === "menu" && (
          <div className="bs-body">
            {/* primary 완료 */}
            <button
              className="bs-action bs-primary"
              disabled={busy}
              onClick={() => onComplete("normal")}
            >
              <span className="bs-action-icon">
                <IconCheck size={22} stroke={3} />
              </span>
              <span className="bs-action-label">완료로 기록</span>
            </button>

            {/* 일부 완료 */}
            <button
              className="bs-action bs-neutral"
              disabled={busy}
              onClick={() => onComplete("partial")}
            >
              <span
                className="bs-action-icon"
                style={{ fontSize: 18, fontWeight: 800, color: "var(--green-700)" }}
              >
                ½
              </span>
              <span className="bs-action-label">일부만 완료</span>
            </button>

            {/* 문제 발견 */}
            <button
              className="bs-action bs-warn"
              disabled={busy}
              onClick={() => setMode("issue")}
            >
              <span className="bs-action-icon" style={{ fontSize: 18 }}>
                ⚠
              </span>
              <span className="bs-action-label">문제 발견</span>
              <IconChevRight size={16} stroke={2.4} className="bs-action-chev" />
            </button>

            {/* 미루기 */}
            <button
              className="bs-action bs-neutral"
              disabled={busy}
              onClick={() => setMode("snooze")}
            >
              <span className="bs-action-icon">
                <IconClock size={20} />
              </span>
              <span className="bs-action-label">내일로 미루기</span>
              <IconChevRight size={16} stroke={2.4} className="bs-action-chev" />
            </button>

            {/* AI 상담 */}
            <button className="bs-action bs-neutral" disabled={busy} onClick={onAskAI}>
              <span className="bs-action-icon">
                <IconBot size={20} color="var(--green-800)" />
              </span>
              <span className="bs-action-label">AI 에게 이 작업 물어보기</span>
              <IconChevRight size={16} stroke={2.4} className="bs-action-chev" />
            </button>

            {/* 삭제 (위험) — 가장 마지막 */}
            <button
              className="bs-action bs-danger"
              disabled={busy}
              onClick={onDelete}
              style={{ marginTop: 4 }}
            >
              <span className="bs-action-icon" style={{ fontSize: 18 }}>
                🗑
              </span>
              <span className="bs-action-label">할 일 삭제</span>
            </button>
          </div>
        )}

        {mode === "issue" && (
          <div className="bs-body">
            <div className="bs-section-h">어떤 문제인가요?</div>
            <div className="bs-issue-grid">
              {ISSUE_TYPES.map((it) => (
                <button
                  key={it.key}
                  className="bs-issue-chip"
                  disabled={busy}
                  onClick={() => onIssue(it.key)}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <textarea
              className="bs-memo-input"
              placeholder="추가 설명 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              style={{ marginTop: 12 }}
            />
            <button
              className="bs-action bs-neutral"
              style={{ marginTop: 12 }}
              onClick={() => setMode("menu")}
            >
              <span className="bs-action-icon">←</span>
              <span className="bs-action-label">뒤로</span>
            </button>
          </div>
        )}

        {mode === "snooze" && (
          <div className="bs-body">
            <div className="bs-section-h">언제로 미룰까요?</div>
            <div className="bs-snooze-grid">
              {SNOOZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="bs-snooze-chip"
                  disabled={busy}
                  onClick={() => onSnooze(p.days)}
                >
                  <div className="bs-snooze-label">{p.label}</div>
                  <div className="bs-snooze-date">{plusDays(p.days)}</div>
                </button>
              ))}
            </div>
            <textarea
              className="bs-memo-input"
              placeholder="미루는 이유 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              style={{ marginTop: 12 }}
            />
            <button
              className="bs-action bs-neutral"
              style={{ marginTop: 12 }}
              onClick={() => setMode("menu")}
            >
              <span className="bs-action-icon">←</span>
              <span className="bs-action-label">뒤로</span>
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
