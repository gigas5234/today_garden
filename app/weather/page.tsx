"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopBar, HeroLocationPill } from "@/components/TopBar";
import {
  IconSettings,
  IconLeaf,
  IconDrop,
  IconWind,
  IconUV,
  IconUmbrella,
  IconDust,
  IconSunrise,
  IconShield,
  IconSunCloud,
  IconClock,
} from "@/components/icons";
import { useLocation } from "@/components/LocationContext";
import { useWeather } from "@/components/useWeather";
import { WeatherIcon, SKY_LABEL } from "@/components/WeatherIcon";

export default function WeatherPage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = React.useState(0);
  const { farm } = useLocation();
  const { snap } = useWeather(farm.lat, farm.lon);
  const cur = snap?.current;
  const days = snap?.daily ?? [];

  const sprayValue = snap?.score.spray.value ?? 30;
  const sprayLevel = snap?.score.spray.level ?? "low";
  const sprayHeadline = snap?.score.spray.headline ?? "";
  const harvestValue = snap?.score.harvest.value ?? 75;
  const harvestLevel = snap?.score.harvest.level ?? "good";
  const harvestHeadline = snap?.score.harvest.headline ?? "";

  const sprayChip = sprayLevel === "low" ? "good" : sprayLevel === "mid" ? "ok" : "warn";
  const sprayLabel = sprayLevel === "low" ? "낮음" : sprayLevel === "mid" ? "보통" : "높음";
  const harvestChip = harvestLevel === "good" ? "good" : harvestLevel === "ok" ? "ok" : "warn";
  const harvestLabel = harvestLevel === "good" ? "좋음" : harvestLevel === "ok" ? "보통" : "주의";

  /* ─────── 메트릭별 위험 단계 ─────── */
  const tempLevel: "" | "warn" | "danger" | "cool" = !cur
    ? ""
    : cur.feelsLike >= 33
      ? "danger"
      : cur.feelsLike >= 28
        ? "warn"
        : cur.feelsLike <= 0
          ? "cool"
          : "";
  const popLevel = !cur ? "" : cur.pop >= 70 ? "danger" : cur.pop >= 50 ? "warn" : "";
  const windLevel = !cur ? "" : cur.windSpeed >= 10 ? "danger" : cur.windSpeed >= 7 ? "warn" : "";
  const uvLevel = !cur ? "" : cur.uv >= 9 ? "danger" : cur.uv >= 7 ? "warn" : "";
  const pmLevel = !cur
    ? ""
    : cur.pm10Grade === "bad"
      ? "danger"
      : cur.pm10Grade === "warn"
        ? "warn"
        : "";
  const humidLevel = !cur ? "" : cur.humidity >= 90 ? "warn" : "";

  /* ─────── 야외/농사 부가 정보 계산 ─────── */
  const hourly = snap?.hourly ?? [];
  const bestSlots = hourly
    .filter((h) => (h.status === "best" || h.status === "good") && !h.time.startsWith("21") && !h.time.startsWith("24"))
    .map((h) => h.time);
  const bestWindow =
    bestSlots.length >= 2
      ? `${bestSlots[0]}~${bestSlots[bestSlots.length - 1]}`
      : bestSlots[0] ?? "오늘 적기 없음";
  const firstRainSlot = hourly.find((h) => h.rain >= 60 || h.sky === "rain" || h.sky === "snow" || h.sky === "sleet");
  const rainNote = firstRainSlot
    ? `${firstRainSlot.time}부터 ${firstRainSlot.sky === "snow" ? "눈" : firstRainSlot.sky === "sleet" ? "비/눈" : "비"} 가능`
    : "오늘 비 안 와요";
  const uvHighSlots = cur && cur.uv >= 7 ? "11시~14시 자외선 강함" : "자외선 무난";
  const wear = (() => {
    const t = cur?.feelsLike ?? 20;
    if (t >= 28) return "반팔·모자·자외선 차단";
    if (t >= 22) return "얇은 긴팔·모자";
    if (t >= 15) return "긴팔 + 가벼운 겉옷";
    if (t >= 8) return "두꺼운 겉옷";
    return "방한복 + 장갑";
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
        날씨 <IconLeaf size={28} />
      </h1>

      {/* 풀블리드 hero — field-5.png 가 화면 좌우 끝까지, 텍스트는 하단 좌측 오버레이 */}
      <div className="weather-hero fade-up">
        <div className="hero-photo-bg" />
        <HeroLocationPill />
        <div className="hero-row">
          <div style={{ flex: 1 }}>
            <div className="h-cap">{cur ? SKY_LABEL[cur.sky] ?? "—" : "—"}</div>
            <div
              className="h-temp"
              style={
                tempLevel === "danger"
                  ? { color: "#FFB1A8" }
                  : tempLevel === "cool"
                    ? { color: "#9BC4E5" }
                    : tempLevel === "warn"
                      ? { color: "#F7B97A" }
                      : undefined
              }
            >
              {cur?.temp ?? "—"}°
            </div>
            <div
              className="h-feel"
              style={
                tempLevel === "danger" || tempLevel === "warn"
                  ? { color: "#F7B97A", fontWeight: 700 }
                  : tempLevel === "cool"
                    ? { color: "#9BC4E5", fontWeight: 700 }
                    : undefined
              }
            >
              체감 {cur?.feelsLike ?? "—"}°
            </div>
          </div>
          <div className="float" style={{ flexShrink: 0, paddingBottom: 6 }}>
            {cur ? <WeatherIcon kind={cur.sky} size={84} /> : <IconSunCloud size={84} />}
          </div>
        </div>
      </div>

      {/* 메트릭 6타일 — hero 밖 카드 */}
      <div className="metric-grid">
        <div className={"metric" + (humidLevel ? " " + humidLevel : "")}>
          <IconDrop size={26} color="#5A8BB5" />
          <div>
            <div className="m-label">습도</div>
            <div className="m-value">{cur?.humidity ?? "—"}%</div>
          </div>
        </div>
        <div className={"metric" + (popLevel ? " " + popLevel : "")}>
          <IconUmbrella size={26} />
          <div>
            <div className="m-label">강수확률</div>
            <div className="m-value">{cur?.pop ?? "—"}%</div>
          </div>
        </div>
        <div className={"metric" + (windLevel ? " " + windLevel : "")}>
          <IconWind size={26} />
          <div>
            <div className="m-label">풍속</div>
            <div className="m-value">{cur?.windSpeed ?? "—"} m/s</div>
          </div>
        </div>
        <div className={"metric" + (uvLevel ? " " + uvLevel : "")}>
          <IconUV size={26} />
          <div>
            <div className="m-label">자외선 (UV)</div>
            <div className="m-value">
              {cur ? `${cur.uv} (${cur.uvLabel})` : "—"}
            </div>
          </div>
        </div>
        <div className={"metric" + (pmLevel ? " " + pmLevel : "")}>
          <IconDust size={26} />
          <div>
            <div className="m-label">미세먼지</div>
            <div className="m-value">{cur?.pm10Label ?? "—"}</div>
          </div>
        </div>
        <div className="metric">
          <IconSunrise size={20} />
          <div>
            <div className="m-label">일출 / 일몰</div>
            <div className="m-value" style={{ fontSize: 15 }}>
              {cur ? `${cur.sunrise} · ${cur.sunset}` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘 야외/농사 가이드 — 자체 룰 베이스 (AI 아님). 바람·옷차림까지 한 카드에 통합 */}
      <div className="card fade-up" style={{ marginTop: 18, padding: 18, animationDelay: "60ms" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--t-md)",
            fontWeight: 800,
            color: "var(--ink-900)",
            marginBottom: 12,
          }}
        >
          <IconLeaf size={18} /> <span>오늘 야외/농사 가이드</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ExtraRow
            icon={<IconClock size={20} />}
            label="작업 추천 시간"
            value={bestWindow}
            tone="good"
          />
          <ExtraRow
            icon={<IconWind size={20} />}
            label="바람"
            value={
              cur && cur.windSpeed > 8
                ? `${cur.windSpeed}m/s — 방제 비추천`
                : cur && cur.windSpeed > 5
                  ? `${cur.windSpeed}m/s — 살포 효율 낮음`
                  : `${cur?.windSpeed ?? "—"}m/s — 작업 좋음`
            }
            tone={cur && cur.windSpeed > 8 ? "warn" : "good"}
          />
          <ExtraRow
            icon={<IconUmbrella size={20} />}
            label="강수 안내"
            value={rainNote}
            tone={firstRainSlot ? "warn" : "good"}
          />
          <ExtraRow
            icon={<IconUV size={20} />}
            label="자외선"
            value={uvHighSlots}
            tone={cur && cur.uv >= 7 ? "warn" : "good"}
          />
          <ExtraRow
            icon={<IconShield size={20} />}
            label="권장 옷차림"
            value={wear}
            tone="ok"
          />
        </div>
      </div>

      {/* 작물 작업 지수 — 방제·수확 지수 한 카드, headline 동일 카드 안에 배치 */}
      <div className="card fade-up" style={{ marginTop: 18, padding: 18, animationDelay: "80ms" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--t-md)",
            fontWeight: 800,
            color: "var(--ink-900)",
            marginBottom: 4,
          }}
        >
          <IconLeaf size={18} /> <span>작물 작업 지수</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 12 }}>
          오늘 날씨 기준 작물 관리 추천
        </div>
        <IndexBlock
          icon={<IconShield size={22} />}
          iconBg="var(--good-bg)"
          label="방제 지수"
          value={sprayValue}
          chip={sprayChip}
          chipLabel={sprayLabel}
          headline={sprayHeadline}
          barColor="var(--green-500)"
        />
        <div style={{ height: 1, background: "var(--line-soft)", margin: "14px 0" }} />
        <IndexBlock
          icon={<IconLeaf size={22} />}
          label="수확 지수"
          value={harvestValue}
          chip={harvestChip}
          chipLabel={harvestLabel}
          headline={harvestHeadline}
          barColor="var(--green-700)"
        />
      </div>

      <div className="section-h">
        <span>주간 예보</span>
      </div>
      <div className="week-row">
        {days.map((d, i) => (
          <div
            key={i}
            className={"day-card" + (i === selectedDay ? " selected" : "") + " fade-up"}
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => setSelectedDay(i)}
          >
            <div className="d-label">{d.label}</div>
            <div className="d-date">{d.date}</div>
            <div>
              <WeatherIcon kind={d.sky} size={36} />
            </div>
            <div className="d-temp">
              {d.hi}° / {d.lo}°
            </div>
            <div className="d-rain">
              <IconDrop size={11} color="#5A8BB5" /> {d.rain}%
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function IndexBlock({
  icon,
  iconBg,
  label,
  value,
  chip,
  chipLabel,
  headline,
  barColor,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value: number;
  chip: string;
  chipLabel: string;
  headline: string;
  barColor: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "4px 0",
        }}
      >
        <div
          className="index-icon"
          style={{
            background: iconBg ?? "var(--green-50)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-900)" }}>
              {label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-700)" }}>
              {value} <span className={"chip " + chip} style={{ marginLeft: 4 }}>{chipLabel}</span>
            </span>
          </div>
          <div className="bar" style={{ flex: "none", width: "100%" }}>
            <span style={{ width: `${value}%`, background: barColor }} />
          </div>
          {headline && (
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-500)",
                marginTop: 8,
                lineHeight: 1.4,
              }}
            >
              {headline}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExtraRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "good" | "ok" | "warn";
}) {
  const bg = tone === "good" ? "var(--good-bg)" : tone === "warn" ? "var(--warn-bg)" : "var(--bg-soft)";
  const fg = tone === "good" ? "var(--green-700)" : tone === "warn" ? "var(--orange-700)" : "var(--ink-700)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: bg,
          color: fg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600 }}>{label}</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--ink-900)",
            marginTop: 2,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

