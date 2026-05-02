/**
 * Google Gemini 3.1 Flash-Lite 클라이언트.
 * SDK: @google/genai
 * Docs: https://ai.google.dev/gemini-api/docs
 *
 * 환경변수 GEMINI_API_KEY 미설정 시 null 반환 — 호출부에서 mock 응답으로 폴백.
 */

import { GoogleGenAI } from "@google/genai";

// 사용자 지정: Gemini 3.1 Flash-Lite. 현재(2026-05) v1beta 의 실제 ID 는 -preview 접미사가 붙어 있다.
// 정식 출시되면 "gemini-3.1-flash-lite" 로 짧아질 수 있음 — 그때 갈아 끼우면 됨.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";

let cached: GoogleGenAI | null | undefined;

export function getGemini(): GoogleGenAI | null {
  if (cached !== undefined) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new GoogleGenAI({ apiKey: key });
  return cached;
}

export const GEMINI_ENABLED = !!process.env.GEMINI_API_KEY;

/**
 * 시스템 인스트럭션 — 거의 변하지 않는 부분.
 * 작물 마스터는 매 요청 시 동적으로 컨텍스트에 추가됨(작물이 변하기 때문).
 */
export const SYSTEM_INSTRUCTION = `너는 한국 노지 채소·과수 재배에 밝은 농업 도우미다.
사용자는 10년차 농부이므로 기본 용어는 생략하고, 구체적인 수치·시간대·작업 순서 위주로 답한다.
모르는 건 모른다고 말한다.

[운영 원칙]
- 약제·농약은 일반명/계열로만 안내. 항상 "제품 라벨의 작물·희석배율 확인" 안내.
- 응답은 짧은 불릿 또는 1~2문단. 60대 이상이 읽기 편하도록 핵심만.
- 사용자가 "오늘"·"내일"이라고 물으면 [현재 상황] 블록의 날짜를 기준으로 해석.
- 사진이 있으면 잎 색·반점·해충 흔적·줄기 상태를 우선 본다. 단정 어려우면 그렇다고 말한다.
- 첫 응답이거나 "오늘 어떤 작업부터" 류 질문엔 다음 3블록 형식 권장:
   1. 지금 우선순위
   2. 날씨 기준
   3. 오늘 추천 순서
`;
