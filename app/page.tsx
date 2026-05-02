"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import {
  IconSettings,
  IconLeaf,
  IconDrop,
  IconWind,
  IconUV,
  IconSunCloud,
  IconSun,
} from "@/components/icons";
import { useLocation } from "@/components/LocationContext";
import { useWeather } from "@/components/useWeather";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { HourStatus } from "@/lib/weather/normalize";

const STATUS_LABEL: Record<HourStatus, string> = {
  good: "좋음",
  best: "최적",
  warn: "주의",
  ok: "보통",
};

const STATUS_CLASS: Record<HourStatus, string> = {
  good: "good",
  best: "good",
  warn: "warn",
  ok: "ok",
};

export default function HourlyPage() {
  const router = useRouter();
  const { farm } = useLocation();
  const { snap } = useWeather(farm.lat, farm.lon);

  const hours = snap?.hourly ?? [];
  const cur = snap?.current;
  const segs = hours.map((h) => h.status);
  const nowIdx = Math.max(0, hours.findIndex((h) => h.isNow));
  const headline = snap?.score.work.headline ?? "정보 수집 중";

  const hscrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!snap || !hscrollRef.current) return;
    const nowEl = hscrollRef.current.querySelector(".hour-card.now") as HTMLElement | null;
    if (nowEl) {
      const target = nowEl.offsetLeft - hscrollRef.current.clientWidth / 2 + nowEl.offsetWidth / 2;
      hscrollRef.current.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
  }, [snap]);

  /* ─────── 오늘의 인사이트 (룰 베이스 — AI 호출 아님) ─────── */
  // 가장 적합도 높은 연속 시간대 찾기
  const bestRun = (() => {
    let bestStart = -1, bestEnd = -1, bestLen = 0;
    let curStart = -1;
    hours.forEach((h, i) => {
      const ok = h.status === "best" || h.status === "good";
      if (ok) {
        if (curStart < 0) curStart = i;
        const len = i - curStart + 1;
        if (len > bestLen) {
          bestLen = len;
          bestStart = curStart;
          bestEnd = i;
        }
      } else {
        curStart = -1;
      }
    });
    return bestLen >= 1 ? { start: hours[bestStart].time, end: hours[bestEnd].time, len: bestLen } : null;
  })();

  // 위험 사유: warn 슬롯이 시작되는 첫 시간 + 사유
  const firstWarn = hours.find((h) => h.status === "warn");
  const reasonWarns = snap?.score.work.reasons.filter((r) => r.status !== "ok") ?? [];

  // 첫 비/눈 슬롯
  const firstWet = hours.find((h) => h.sky === "rain" || h.sky === "snow" || h.sky === "sleet" || h.rain >= 60);

  // 메인 타이틀: 가장 두드러진 위험 또는 적기
  const insightTitle = (() => {
    if (cur && cur.feelsLike >= 33) return "오늘 더위 위험 — 한낮 작업 피하세요";
    if (cur && cur.feelsLike <= 0) return "한파 — 보온 필수";
    if (firstWet) return `${firstWet.time}부터 ${firstWet.sky === "snow" ? "눈" : firstWet.sky === "sleet" ? "비/눈" : "비"} 가능`;
    if (cur && cur.windSpeed >= 8) return "바람 강함 — 방제 작업 비추천";
    if (cur && cur.uv >= 9) return "자외선 매우 높음 — 한낮 야외 작업 피하세요";
    if (cur && cur.uv >= 7) return `자외선 ${cur.uvLabel} — 모자·토시 권장`;
    if (cur && cur.pm10 != null && cur.pm10 > 150) return "미세먼지 나쁨 — 마스크 필수";
    if (bestRun && bestRun.len >= 3) return `${bestRun.start} ~ ${bestRun.end} 작업 적기`;
    return "오늘은 작업 무난해요";
  })();

  // 보조 라인: 대안 권고
  const insightSub = (() => {
    if (cur && cur.feelsLike >= 33) {
      const cool = hours.find((h) => h.status === "best" || h.status === "good");
      return cool ? `${cool.time}대 시원할 때 작업` : "이른 아침·저녁만 권장";
    }
    if (firstWet) return "방제·관수는 비 오기 전에 마무리";
    if (cur && cur.uv >= 7 && bestRun) return `자외선 약한 ${bestRun.start} 전후 추천`;
    if (cur && cur.windSpeed >= 6) return "살포 작업은 풍속 5m/s 이하에서";
    if (reasonWarns.length > 0) return reasonWarns[0].note;
    if (bestRun) return `${bestRun.start} ~ ${bestRun.end}, 약 ${bestRun.len * 3}시간 적기`;
    return "시간대별 적합도를 확인하세요";
  })();

  // 부가 한 줄: 풍속/체감/PM10 중 가장 의미 있는 정보
  const insightExtra = (() => {
    if (!cur) return null;
    if (firstWarn && !firstWet) return `${firstWarn.time}부터 적합도 떨어져요`;
    if (cur.humidity >= 85) return `습도 ${cur.humidity}% — 병해 발생 주의`;
    if (cur.windSpeed <= 3 && cur.pop <= 20) return "바람 약함 + 비 없음 → 방제 적기";
    if (cur.pm10 != null && cur.pm10 <= 50) return `미세먼지 ${cur.pm10}㎍ — 환기 좋음`;
    return null;
  })();

  return (
    <div className="screen-anim">
      <TopBar
        rightSlot={
          <button
            className="icon-btn"
            aria-label="설정"
            onClick={() => router.push("/settings")}
          >
            <IconSettings size={20} />
          </button>
        }
      />

      <h1 className="page-title">
        시간별 예보 <IconLeaf size={28} />
      </h1>

      <div className="card fade-up" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--ink-700)",
                marginBottom: 8,
              }}
            >
              현재 날씨
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="float">
                {cur ? (
                  <WeatherIcon kind={cur.sky} size={64} />
                ) : (
                  <IconSunCloud size={64} />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    color: "var(--ink-900)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {cur?.temp ?? "—"}°
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-500)",
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  체감 {cur?.feelsLike ?? "—"}°
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconDrop size={20} color="#5A8BB5" />
              <span style={{ fontSize: 15, color: "var(--ink-700)", fontWeight: 600 }}>습도</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink-900)",
                  marginLeft: "auto",
                }}
              >
                {cur?.humidity ?? "—"}%
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconWind size={20} />
              <span style={{ fontSize: 15, color: "var(--ink-700)", fontWeight: 600 }}>풍속</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink-900)",
                  marginLeft: "auto",
                }}
              >
                {cur?.windSpeed ?? "—"} m/s
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconUV size={20} />
              <span style={{ fontSize: 15, color: "var(--ink-700)", fontWeight: 600 }}>UV</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--orange-700)",
                  marginLeft: "auto",
                }}
              >
                {cur ? `${cur.uv} (${cur.uvLabel})` : "—"}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: "var(--t-md)",
            fontWeight: 700,
            color: "var(--green-800)",
          }}
        >
          <IconLeaf size={18} />
          <span>{headline}</span>
        </div>
      </div>

      <div className="section-h">
        <span>시간별 예보</span>
      </div>
      <div ref={hscrollRef} className="hscroll" style={{ paddingTop: 14, paddingBottom: 8 }}>
        {hours.map((h, i) => (
          <div
            key={i}
            className={"hour-card" + (h.isNow ? " now" : "")}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {h.isNow && <span className="now-pill">지금</span>}
            <div className="hour-label">{h.time}</div>
            <div className={h.isNow ? "float" : ""} style={{ marginTop: 2 }}>
              <WeatherIcon kind={h.sky} size={42} />
            </div>
            <div className="hour-temp">{h.temp}°</div>
            <div className="hour-rain">
              <IconDrop size={12} color="#5A8BB5" /> {h.rain}%
            </div>
            <span
              className={"chip " + STATUS_CLASS[h.status]}
              style={{ marginTop: 4, fontSize: 12, padding: "3px 10px" }}
            >
              {STATUS_LABEL[h.status]}
            </span>
          </div>
        ))}
      </div>

      <div
        className="card fade-up"
        style={{ marginTop: 22, padding: 18, animationDelay: "120ms" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "var(--t-md)",
              fontWeight: 700,
              color: "var(--ink-900)",
            }}
          >
            <span>작업 적합 시간</span> <IconLeaf size={18} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-500)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--good)",
                }}
              />{" "}
              좋음
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--green-300)",
                }}
              />{" "}
              보통
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--warn)",
                }}
              />{" "}
              주의
            </span>
          </div>
        </div>
        <div
          className="suit-bar"
          style={{ gridTemplateColumns: `repeat(${segs.length}, 1fr)` }}
        >
          {segs.map((s, i) => (
            <div
              key={i}
              className={"suit-seg " + s}
              style={{ animation: `fadeIn .4s ease-out ${i * 60}ms both` }}
            />
          ))}
        </div>
        <div className="suit-arrow">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${segs.length}, 1fr)`, height: 8 }}>
            {segs.map((_, i) => (
              <div key={i} style={{ position: "relative" }}>
                {i === nowIdx && (
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -2,
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "7px solid var(--green-800)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          className="suit-labels"
          style={{ marginTop: 6, gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}
        >
          {hours.map((h, i) => (
            <span key={i} className={h.isNow ? "now" : ""}>
              {h.time}
            </span>
          ))}
        </div>
      </div>

      <div className="insight fade-up" style={{ marginTop: 22, animationDelay: "200ms" }}>
        <div className="insight-icon">
          <IconSun size={32} />
        </div>
        <div className="insight-body">
          <div className="i-cap">오늘의 인사이트</div>
          <div className="i-title">{insightTitle}</div>
          <div className="i-sub">{insightSub}</div>
          {insightExtra && (
            <div
              className="i-sub"
              style={{ marginTop: 4, color: "var(--green-700)", fontWeight: 600 }}
            >
              · {insightExtra}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
