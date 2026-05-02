/**
 * AI 상담 응답 구조 — Gemini 가 JSON 으로 반환.
 * 클라이언트는 JSON 문자열을 받아 이 타입으로 파싱한 뒤 카드 형태로 렌더링.
 */

export type AnswerMode =
  | "today_plan"
  | "image_diagnosis"
  | "crop_question"
  | "weather_work"
  | "task_help"
  | "general";

export type CardType =
  | "priority"
  | "diagnosis"
  | "weather"
  | "action"
  | "caution"
  | "record"
  | "info";

export type Urgency = "high" | "medium" | "low" | "none";

export type AnswerActionTime =
  | "지금"
  | "오전"
  | "오후"
  | "해질녘"
  | "내일"
  | "해당 없음";

export type AnswerActionPriority = "high" | "medium" | "low";

export type AnswerCard = {
  type: CardType;
  title: string;
  body?: string;
  items?: string[];
  chips?: string[];
  urgency?: Urgency;
};

export type AnswerAction = {
  label: string;
  detail?: string;
  time?: AnswerActionTime;
  priority?: AnswerActionPriority;
};

export type AiAnswer = {
  mode: AnswerMode;
  summary: string;
  confidence: "high" | "medium" | "low";
  cards: AnswerCard[];
  actions: AnswerAction[];
  cautions: string[];
  records: string[];
  need_more_info: {
    needed: boolean;
    questions: string[];
  };
  quick_reply_suggestions: string[];
};

/**
 * 모델이 깨진 JSON 을 돌려보낼 때를 대비 — 안전한 빈 답변.
 */
export const EMPTY_ANSWER: AiAnswer = {
  mode: "general",
  summary: "",
  confidence: "low",
  cards: [],
  actions: [],
  cautions: [],
  records: [],
  need_more_info: { needed: false, questions: [] },
  quick_reply_suggestions: [],
};

/**
 * 안전 파싱. 텍스트가 JSON 이 아니면 null.
 * 모델이 ```json ... ``` 같은 코드블록을 곁들였을 경우도 대응.
 */
export function parseAnswer(raw: string): AiAnswer | null {
  if (!raw) return null;
  let text = raw.trim();
  // 코드 블록 fence 제거
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    text = text.trim();
  }
  // 첫 { ~ 마지막 } 사이만 추출
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice) as Partial<AiAnswer>;
    return {
      mode: (obj.mode as AnswerMode) ?? "general",
      summary: typeof obj.summary === "string" ? obj.summary : "",
      confidence: (obj.confidence as AiAnswer["confidence"]) ?? "low",
      cards: Array.isArray(obj.cards) ? (obj.cards as AnswerCard[]) : [],
      actions: Array.isArray(obj.actions) ? (obj.actions as AnswerAction[]) : [],
      cautions: Array.isArray(obj.cautions) ? (obj.cautions as string[]) : [],
      records: Array.isArray(obj.records) ? (obj.records as string[]) : [],
      need_more_info:
        obj.need_more_info && typeof obj.need_more_info === "object"
          ? {
              needed: !!obj.need_more_info.needed,
              questions: Array.isArray(obj.need_more_info.questions)
                ? obj.need_more_info.questions
                : [],
            }
          : { needed: false, questions: [] },
      quick_reply_suggestions: Array.isArray(obj.quick_reply_suggestions)
        ? (obj.quick_reply_suggestions as string[])
        : [],
    };
  } catch {
    return null;
  }
}
