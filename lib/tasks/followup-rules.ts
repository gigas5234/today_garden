/**
 * 작업 종류 자동 감지 + 다음 알림(followup) 일수 룰.
 * task.task_kind 가 비어 있으면 task.title 키워드로 추정한다.
 */

export type TaskKind =
  | "방제"
  | "수확"
  | "물주기"
  | "북주기"
  | "곁순제거"
  | "건조"
  | "issue_found"
  | "other";

export type FollowupRule = {
  days: number;
  /** crop 이름이 있으면 활용 가능. */
  label: (cropName?: string) => string;
};

/* ───────── 룰 정의 ───────── */

export const FOLLOWUP_RULES: Record<TaskKind, FollowupRule | null> = {
  방제: { days: 7, label: (c) => `${c ?? "작물"} 방제 효과 확인` },
  수확: { days: 2, label: (c) => `${c ?? "작물"} 추가 수확 시점 확인` },
  물주기: { days: 3, label: () => "흙 상태 확인 후 다음 관수 판단" },
  북주기: { days: 25, label: (c) => `${c ?? "작물"} 북주기 후 생육 확인` },
  곁순제거: { days: 6, label: (c) => `${c ?? "작물"} 곁순 다시 점검` },
  건조: { days: 1, label: () => "건조 상태 점검" },
  issue_found: { days: 1, label: () => "발견한 문제 재확인" },
  other: null, // followup 자동 생성 안 함
};

/* ───────── 키워드 기반 자동 분류 ───────── */

const KEYWORDS: Array<[TaskKind, string[]]> = [
  ["방제", ["방제", "약 ", "약치", "약제", "살포", "농약"]],
  ["수확", ["수확", "따기", "따자"]],
  ["물주기", ["관수", "물 주", "물주", "물주기", "물 주기"]],
  ["북주기", ["북주기", "북돋", "북 돋"]],
  ["곁순제거", ["곁순", "순치기", "순 따", "순따"]],
  ["건조", ["건조", "말리"]],
];

export function detectTaskKind(title: string, explicit?: string | null): TaskKind {
  if (explicit && explicit in FOLLOWUP_RULES) return explicit as TaskKind;
  const t = title.toLowerCase();
  for (const [kind, words] of KEYWORDS) {
    if (words.some((w) => t.includes(w.toLowerCase()))) return kind;
  }
  return "other";
}

/** 룰 기반 followup task input 생성. null 이면 자동 생성 안 함. */
export function buildFollowupTask(
  sourceTitle: string,
  sourceTaskKind: TaskKind | null | undefined,
  cropName: string | undefined,
  resultStatus: "normal" | "partial" | "issue_found" | "needs_followup" | undefined
): { title: string; days: number; rule_kind: TaskKind } | null {
  // 문제 발견은 무조건 다음날 재확인
  if (resultStatus === "issue_found") {
    const r = FOLLOWUP_RULES.issue_found!;
    return { title: r.label(cropName), days: r.days, rule_kind: "issue_found" };
  }

  const kind = sourceTaskKind ?? detectTaskKind(sourceTitle);
  const rule = FOLLOWUP_RULES[kind];
  if (!rule) return null;
  return { title: rule.label(cropName), days: rule.days, rule_kind: kind };
}

/** 오늘 + N일 의 ISO date(YYYY-MM-DD). KST 기준. */
export function plusDaysKst(days: number): string {
  const n = new Date();
  // KST 보정
  const kst = new Date(n.getTime() + n.getTimezoneOffset() * 60_000 + 9 * 3_600_000);
  kst.setDate(kst.getDate() + days);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(
    kst.getDate()
  ).padStart(2, "0")}`;
}
