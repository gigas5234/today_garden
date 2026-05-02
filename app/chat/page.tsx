"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useLocation } from "@/components/LocationContext";
import { useWeather } from "@/components/useWeather";
import { AnswerView, AnswerParseError } from "@/components/chat/AnswerView";
import { type AiAnswer, parseAnswer } from "@/lib/ai/types";

import {
  IconSettings,
  IconLeaf,
  IconBot,
  IconSparkle,
  IconSend,
  IconPlus,
  IconCheck,
} from "@/components/icons";

type Msg = {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
  imageDataUrl?: string;   // user 가 첨부한 사진 (data:image/...;base64,)
  /** model 메시지에 한해, 스트림 종료 후 파싱된 구조화 응답 */
  parsedAnswer?: AiAnswer;
  parseError?: boolean;
};

type LastPrompt = {
  model: string;
  systemInstruction: string;
  userPrompt: string;
  hasImage: boolean;
} | null;

function nowTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

async function fileToBase64(file: File): Promise<{ data: string; mime: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      const comma = dataUrl.indexOf(",");
      resolve({
        dataUrl,
        mime: file.type || "image/jpeg",
        data: dataUrl.slice(comma + 1),
      });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={null}>
      <ChatScreen />
    </React.Suspense>
  );
}

function ChatScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("initial");
  const { farm } = useLocation();
  const { snap } = useWeather(farm.lat, farm.lon);

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [serverPills, setServerPills] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingImage, setPendingImage] = React.useState<{
    dataUrl: string;
    data: string;
    mime: string;
  } | null>(null);
  const [lastPrompt, setLastPrompt] = React.useState<LastPrompt>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [pillsOpen, setPillsOpen] = React.useState(false);

  const localPills = React.useMemo(() => {
    if (!snap) return [];
    const c = snap.current;
    return [`#강수확률_${c.pop}%`, `#습도_${c.humidity}%`, `#UV_${c.uv}`];
  }, [snap]);
  const pills = serverPills.length > 0 ? serverPills : localPills;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const consumedInitial = React.useRef(false);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("이미지가 너무 큽니다 (최대 8MB)");
      return;
    }
    const enc = await fileToBase64(file);
    setPendingImage(enc);
  };

  const send = React.useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if ((!text && !pendingImage) || streaming) return;

      const userMsg: Msg = {
        id: "u" + Date.now(),
        role: "user",
        text: text || (pendingImage ? "(사진 분석 요청)" : ""),
        time: nowTime(),
        imageDataUrl: pendingImage?.dataUrl,
      };
      const aiMsgId = "a" + Date.now();
      const aiMsg: Msg = { id: aiMsgId, role: "model", text: "", time: nowTime() };

      setMessages((m) => [...m, userMsg, aiMsg]);
      setInput("");
      setStreaming(true);
      setError(null);

      // 과거 model 메시지는 raw JSON 대신 summary 만 보내서 컨텍스트 압축
      const history: Array<{
        role: "user" | "model";
        text: string;
        imageBase64?: string;
        imageMime?: string;
      }> = [...messages, userMsg].map((m) => {
        if (m.role === "model" && m.parsedAnswer?.summary) {
          return { role: "model", text: m.parsedAnswer.summary };
        }
        return { role: m.role, text: m.text };
      });
      // 이미지는 마지막 user 메시지에만 부착
      if (pendingImage) {
        const last = history[history.length - 1];
        last.imageBase64 = pendingImage.data;
        last.imageMime = pendingImage.mime;
      }

      const sentImage = !!pendingImage;
      setPendingImage(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lat: farm.lat,
            lon: farm.lon,
            messages: history,
          }),
        });
        if (!res.ok || !res.body) throw new Error(`http ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const payload = line.slice(6);
            try {
              const ev = JSON.parse(payload);
              if (ev.type === "context") {
                if (Array.isArray(ev.pills)) setServerPills(ev.pills);
                if (ev.debug) {
                  setLastPrompt({
                    model: ev.debug.model,
                    systemInstruction: ev.debug.systemInstruction,
                    userPrompt: ev.debug.userPrompt,
                    hasImage: ev.debug.hasImage ?? sentImage,
                  });
                }
              } else if (ev.type === "delta" && typeof ev.text === "string") {
                setMessages((m) =>
                  m.map((x) => (x.id === aiMsgId ? { ...x, text: x.text + ev.text } : x))
                );
              } else if (ev.type === "error") {
                setError(ev.message ?? "오류");
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setStreaming(false);
        // 스트림 종료 — 누적된 raw 텍스트를 JSON 으로 파싱해 구조화 답변 부착
        setMessages((m) =>
          m.map((x) => {
            if (x.id !== aiMsgId) return x;
            const parsed = parseAnswer(x.text);
            return parsed
              ? { ...x, parsedAnswer: parsed, parseError: false }
              : { ...x, parseError: !!x.text };
          })
        );
      }
    },
    [input, pendingImage, farm.lat, farm.lon, messages, streaming]
  );

  React.useEffect(() => {
    if (initial && !consumedInitial.current) {
      consumedInitial.current = true;
      send(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="screen-anim" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar
        rightSlot={
          <button className="icon-btn" aria-label="설정" onClick={() => router.push("/settings")}>
            <IconSettings size={20} />
          </button>
        }
      />

      <h1 className="page-title compact">
        AI 상담 <IconLeaf size={20} />
      </h1>

      {/* 현재 참고 중 — 접힘/펼침 토글, 디폴트 닫힘 */}
      <button
        type="button"
        onClick={() => setPillsOpen((v) => !v)}
        className="ctx-toggle"
        aria-expanded={pillsOpen}
      >
        <IconSparkle size={14} color="#3A7C58" />
        <span>현재 참고 중</span>
        <span className="ctx-toggle-count">
          {pills.length > 0 ? `${pills.length}개` : "수집 중"}
        </span>
        <span className={"ctx-toggle-chev" + (pillsOpen ? " open" : "")} aria-hidden>
          ▾
        </span>
      </button>
      {pillsOpen && (
        <>
          <div className="pill-row" style={{ marginTop: 6 }}>
            {pills.length > 0 ? (
              pills.map((p) => (
                <span key={p} className="ctx-pill">
                  {p}
                </span>
              ))
            ) : (
              <span className="ctx-pill" style={{ color: "var(--ink-400)" }}>
                #날씨_불러오는중
              </span>
            )}
          </div>
          {lastPrompt && (
            <button
              onClick={() => setShowPrompt((v) => !v)}
              style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: showPrompt ? "var(--green-800)" : "var(--bg-soft)",
                color: showPrompt ? "white" : "var(--ink-700)",
                border: "1px solid var(--line)",
                alignSelf: "flex-start",
              }}
            >
              {showPrompt ? "프롬프트 닫기" : "전송된 프롬프트 보기"}
            </button>
          )}
        </>
      )}

      {/* 전송된 프롬프트 디버그 패널 */}
      {showPrompt && lastPrompt && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 14,
            margin: "8px 0 12px",
            fontSize: 12,
            color: "var(--ink-700)",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: 800, color: "var(--ink-900)", marginBottom: 6 }}>
            모델: {lastPrompt.model}
            {lastPrompt.hasImage && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "var(--green-700)" }}>
                · 이미지 첨부됨
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, marginTop: 8, color: "var(--ink-900)" }}>
            시스템 인스트럭션
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              margin: "4px 0 8px",
              color: "var(--ink-700)",
            }}
          >
            {lastPrompt.systemInstruction}
          </pre>
          <div style={{ fontWeight: 700, color: "var(--ink-900)" }}>사용자 프롬프트 (실제 전송)</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              margin: "4px 0 0",
              color: "var(--ink-700)",
            }}
          >
            {lastPrompt.userPrompt}
          </pre>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 8,
          marginLeft: -4,
          marginRight: -4,
          paddingLeft: 4,
          paddingRight: 4,
          paddingBottom: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--ink-500)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            궁금한 점을 입력해 보세요.
            <br />
            현재 위치·날씨·등록 작물이 자동으로 함께 전달됩니다.
            <br />
            <span style={{ color: "var(--ink-400)", fontSize: 12 }}>
              예) 오늘 어떤 작업부터 하는 게 좋을까?
              <br /> + 버튼으로 사진을 첨부하면 함께 분석합니다.
            </span>
          </div>
        )}

        {messages.map((m) => (
          <React.Fragment key={m.id}>
            {m.role === "user" ? (
              <div className="msg-row user">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, maxWidth: "82%" }}>
                  {m.imageDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.imageDataUrl}
                      alt="첨부 사진"
                      style={{
                        maxWidth: 220,
                        maxHeight: 220,
                        borderRadius: 16,
                        border: "1px solid var(--line)",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {m.text && <div className="bubble user">{m.text}</div>}
                  <div className="timestamp">{m.time} ✓✓</div>
                </div>
              </div>
            ) : (
              <div className="msg-row">
                <div className="ai-avatar">
                  <IconBot size={22} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "92%", flex: 1 }}>
                  {/* 1) 스트리밍 중 또는 응답 시작 전 → 타이핑 점 */}
                  {!m.parsedAnswer && !m.parseError && (
                    <div className="bubble ai" style={{ padding: 0 }}>
                      <div className="typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                  {/* 2) JSON 파싱 성공 → 구조화 카드 */}
                  {m.parsedAnswer && (
                    <AnswerView
                      answer={m.parsedAnswer}
                      onQuickReply={(text) => send(text)}
                    />
                  )}
                  {/* 3) JSON 파싱 실패 → 원문 fallback */}
                  {m.parseError && <AnswerParseError raw={m.text} />}
                  <div className="timestamp">{m.time}</div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {error && (
          <div
            style={{
              alignSelf: "center",
              padding: "8px 12px",
              borderRadius: 12,
              background: "var(--warn-bg)",
              color: "var(--orange-700)",
              fontSize: 13,
            }}
          >
            ⚠ {error}
          </div>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          background: "linear-gradient(180deg, transparent 0%, var(--bg) 30%)",
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        {/* 첨부 미리보기 */}
        {pendingImage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginBottom: 8,
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage.dataUrl}
              alt="첨부 미리보기"
              style={{
                width: 48,
                height: 48,
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}
            />
            <div style={{ flex: 1, fontSize: 13, color: "var(--ink-700)", fontWeight: 600 }}>
              사진 1장 · 메시지와 함께 보내면 분석됩니다
            </div>
            <button
              onClick={() => setPendingImage(null)}
              style={{
                fontSize: 12,
                color: "var(--ink-500)",
                padding: "6px 10px",
                border: "1px solid var(--line)",
                borderRadius: 999,
              }}
            >
              제거
            </button>
          </div>
        )}

        <div className="composer">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onPickImage}
          />
          <button
            className="add-btn"
            aria-label="사진 첨부"
            title="사진 첨부"
            onClick={() => fileRef.current?.click()}
            disabled={streaming}
          >
            {pendingImage ? <IconCheck size={20} color="var(--green-800)" stroke={2.6} /> : <IconPlus size={20} />}
          </button>
          <input
            type="text"
            placeholder={
              streaming
                ? "AI가 답변 중..."
                : pendingImage
                  ? "사진과 함께 물어볼 내용..."
                  : "메시지를 입력하세요..."
            }
            value={input}
            disabled={streaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className={"send-btn" + ((!input.trim() && !pendingImage) || streaming ? " disabled" : "")}
            onClick={() => send()}
            aria-label="보내기"
            disabled={(!input.trim() && !pendingImage) || streaming}
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
