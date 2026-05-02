import { NextRequest } from "next/server";
import { DEFAULT_FARM, farmAt } from "@/lib/farms";
import { buildChatContext, buildImageNotice } from "@/lib/gemini/context";
import { GEMINI_ENABLED, GEMINI_MODEL, SYSTEM_INSTRUCTION, getGemini } from "@/lib/gemini/client";

export const runtime = "nodejs";

type IncomingMsg = {
  role: "user" | "model";
  /** user 일 땐 사용자 입력. model 일 땐 (가능하면) 과거 답변의 summary 만 보냄 */
  text: string;
  /** base64 — without data: prefix */
  imageBase64?: string;
  imageMime?: string;
};

type ChatBody = {
  /** 클라가 geolocation 으로 받아온 사용자 좌표. 없으면 DEFAULT_FARM 사용. */
  lat?: number;
  lon?: number;
  /** 가장 마지막 항목이 사용자 새 메시지 */
  messages: IncomingMsg[];
};

function resolveFarm(body: ChatBody) {
  if (typeof body.lat === "number" && typeof body.lon === "number") {
    return farmAt(body.lat, body.lon);
  }
  return DEFAULT_FARM;
}

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatBody;
  if (!body.messages?.length) {
    return new Response(sse({ type: "error", message: "messages required" }), {
      status: 400,
      headers: { "content-type": "text/event-stream" },
    });
  }

  const farm = resolveFarm(body);
  const ctx = await buildChatContext(farm);

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new Response(sse({ type: "error", message: "no user message" }), {
      status: 400,
      headers: { "content-type": "text/event-stream" },
    });
  }

  // 마지막 사용자 메시지에 컨텍스트 + (이미지 안내) prepend
  const hasImage = !!(lastUser.imageBase64 && lastUser.imageMime);
  const imageNotice = buildImageNotice(hasImage);
  const userPromptText = `${ctx.text}\n${imageNotice}[질문] ${lastUser.text}`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: unknown) => controller.enqueue(enc.encode(sse(e)));

      // 컨텍스트 메타 — UI에서 칩 갱신용 + 디버그용 실제 전송 프롬프트
      send({
        type: "context",
        pills: ctx.pills,
        debug: {
          model: GEMINI_MODEL,
          systemInstruction: SYSTEM_INSTRUCTION,
          userPrompt: userPromptText,
          hasImage: !!(lastUser.imageBase64 && lastUser.imageMime),
        },
      });

      // Gemini 미설정 → 안내만 반환하고 종료
      if (!GEMINI_ENABLED) {
        send({
          type: "error",
          message: "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 을 확인해 주세요.",
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      try {
        const ai = getGemini()!;
        const history = body.messages.slice(0, -1).map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        const lastParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
          { text: userPromptText },
        ];
        if (lastUser.imageBase64 && lastUser.imageMime) {
          lastParts.push({
            inlineData: { mimeType: lastUser.imageMime, data: lastUser.imageBase64 },
          });
        }

        const result = await ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents: [...history, { role: "user", parts: lastParts as never }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.6,
            maxOutputTokens: 2048,
            // 새 시스템 인스트럭션이 JSON 응답을 강제 — 모델 측에서도 JSON 모드로 보장
            responseMimeType: "application/json",
          },
        });

        for await (const chunk of result) {
          const text = chunk?.text;
          if (text) send({ type: "delta", text });
        }
        send({ type: "done" });
      } catch (e) {
        console.error("[chat] gemini error", e);
        send({ type: "error", message: String((e as Error).message ?? e) });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
