"use client";

import * as React from "react";
import type {
  AiAnswer,
  AnswerAction,
  AnswerCard,
  CardType,
  Urgency,
} from "@/lib/ai/types";

/**
 * 구조화 답변 렌더링 — 카드/액션/주의/기록/추가질문/Quick reply.
 * 모든 서브 컴포넌트가 한 파일에 collocate.
 */

const CARD_LABEL: Record<CardType, string> = {
  priority: "우선순위",
  diagnosis: "진단",
  weather: "날씨 기준",
  action: "할 일",
  caution: "주의",
  record: "기록 권장",
  info: "정보",
};

const URGENCY_CLASS: Record<Urgency, string> = {
  high: "answer-card-urgency-high",
  medium: "answer-card-urgency-medium",
  low: "answer-card-urgency-low",
  none: "",
};

/* ─────────────────────── SummaryCard ─────────────────────── */

function SummaryCard({
  text,
  confidence,
}: {
  text: string;
  confidence: AiAnswer["confidence"];
}) {
  if (!text) return null;
  const conf =
    confidence === "high" ? "확신 높음" : confidence === "medium" ? "보통" : "낮음";
  const confClass =
    confidence === "high" ? "good" : confidence === "low" ? "warn" : "ok";
  return (
    <div className="answer-summary">
      <div className="answer-summary-text">{text}</div>
      <span className={"chip " + confClass} style={{ fontSize: 11, padding: "2px 8px" }}>
        {conf}
      </span>
    </div>
  );
}

/* ─────────────────────── AnswerCardItem ─────────────────────── */

function AnswerCardItem({ card }: { card: AnswerCard }) {
  const cls = ["answer-card", `answer-card-${card.type}`, URGENCY_CLASS[card.urgency ?? "none"]]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="answer-card-head">
        <span className="answer-card-tag">{CARD_LABEL[card.type] ?? card.type}</span>
        <span className="answer-card-title">{card.title}</span>
      </div>
      {card.body && <div className="answer-card-body">{card.body}</div>}
      {card.items && card.items.length > 0 && (
        <ul className="answer-card-items">
          {card.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
      {card.chips && card.chips.length > 0 && (
        <div className="answer-card-chips">
          {card.chips.map((c, i) => (
            <span key={i} className="answer-card-chip">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── ActionTimeline ─────────────────────── */

const TIME_ORDER = ["지금", "오전", "오후", "해질녘", "내일", "해당 없음"] as const;

function ActionTimeline({ actions }: { actions: AnswerAction[] }) {
  // 시간대별로 그룹핑 후 우선순위 내림차순
  const groups: Record<string, AnswerAction[]> = {};
  for (const a of actions) {
    const t = a.time ?? "해당 없음";
    if (!groups[t]) groups[t] = [];
    groups[t].push(a);
  }
  const orderedTimes = TIME_ORDER.filter((t) => groups[t]);
  if (orderedTimes.length === 0) return null;
  return (
    <div className="answer-actions">
      <div className="answer-section-title">오늘 할 일</div>
      {orderedTimes.map((t) => (
        <div key={t} className="answer-action-group">
          <div className="answer-action-time">{t}</div>
          {groups[t].map((a, i) => (
            <div key={i} className="answer-action-row">
              <span
                className={
                  "answer-action-dot " +
                  (a.priority === "high"
                    ? "high"
                    : a.priority === "medium"
                      ? "medium"
                      : "low")
                }
                aria-hidden
              />
              <div style={{ flex: 1 }}>
                <div className="answer-action-label">{a.label}</div>
                {a.detail && <div className="answer-action-detail">{a.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── CautionBox ─────────────────────── */

function CautionBox({ cautions }: { cautions: string[] }) {
  if (!cautions.length) return null;
  return (
    <div className="answer-cautions">
      <div className="answer-section-title">⚠ 주의</div>
      <ul>
        {cautions.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────── RecordSuggestionList ─────────────────────── */

function RecordSuggestionList({ records }: { records: string[] }) {
  if (!records.length) return null;
  return (
    <div className="answer-records">
      <div className="answer-section-title">📒 기록하면 좋은 항목</div>
      <ul>
        {records.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────── FollowUpQuestions ─────────────────────── */

function FollowUpQuestions({
  questions,
  onSend,
}: {
  questions: string[];
  onSend?: (q: string) => void;
}) {
  if (!questions.length) return null;
  return (
    <div className="answer-followup">
      <div className="answer-section-title">❓ 추가로 알려주세요</div>
      <div className="answer-followup-list">
        {questions.map((q, i) => (
          <button
            key={i}
            className="answer-followup-item"
            onClick={() => onSend?.(q)}
            disabled={!onSend}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── QuickReplyChips ─────────────────────── */

function QuickReplyChips({
  suggestions,
  onSend,
}: {
  suggestions: string[];
  onSend?: (q: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="answer-quick-replies">
      {suggestions.map((s, i) => (
        <button
          key={i}
          className="answer-quick-reply"
          onClick={() => onSend?.(s)}
          disabled={!onSend}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────── AnswerView (composition) ─────────────────────── */

export function AnswerView({
  answer,
  onQuickReply,
}: {
  answer: AiAnswer;
  /** quick-reply 또는 follow-up 클릭 시 자동 전송 */
  onQuickReply?: (text: string) => void;
}) {
  return (
    <div className="answer-view">
      <SummaryCard text={answer.summary} confidence={answer.confidence} />

      {answer.cards.map((card, i) => (
        <AnswerCardItem key={i} card={card} />
      ))}

      <ActionTimeline actions={answer.actions} />
      <CautionBox cautions={answer.cautions} />
      <RecordSuggestionList records={answer.records} />

      {answer.need_more_info?.needed && (
        <FollowUpQuestions
          questions={answer.need_more_info.questions}
          onSend={onQuickReply}
        />
      )}

      <QuickReplyChips suggestions={answer.quick_reply_suggestions} onSend={onQuickReply} />
    </div>
  );
}

/** 파싱 실패 시 raw 텍스트 보기. */
export function AnswerParseError({ raw }: { raw: string }) {
  return (
    <div className="answer-parse-error">
      <div className="answer-section-title" style={{ color: "var(--orange-700)" }}>
        ⚠ 응답 형식 오류 — 원문 표시
      </div>
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13 }}>
        {raw}
      </pre>
    </div>
  );
}
