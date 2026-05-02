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

  const morningGood =
    hours.slice(0, 4).every((h) => h.status === "best" || h.status === "good");
  const insightTitle = cur && cur.uv >= 7 ? `${cur.uvLabel} 자외선 시간대 주의` : "오늘은 작업 무난해요";
  const insightSub = morningGood ? "오전 10시 전후가 작업하기 좋아요" : "시간대별 적합도를 확인하세요";

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
        <div className="suit-bar">
          {segs.map((s, i) => (
            <div
              key={i}
              className={"suit-seg " + s}
              style={{ animation: `fadeIn .4s ease-out ${i * 60}ms both` }}
            />
          ))}
        </div>
        <div className="suit-arrow">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", height: 8 }}>
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
        <div className="suit-labels" style={{ marginTop: 6 }}>
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
        </div>
      </div>
    </div>
  );
}
