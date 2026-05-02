import { Farm } from "../farms";
import { fetchSidoAir, PM_LABEL, PmGrade } from "../air/client";
import { fetchSun } from "../kasi/client";
import {
  fetchUltraSrtNcst,
  fetchVilageFcst,
  KmaForecastItem,
  KmaNcstItem,
} from "../kma/client";
import {
  harvestIndex,
  hourlyStatus,
  HourStatus,
  Reason,
  sprayIndex,
  workScore,
} from "../score/calc";

export type SkyKind = "sun" | "sun-cloud" | "cloud" | "moon-cloud" | "rain" | "snow" | "sleet";
export type { HourStatus } from "../score/calc";

export type HourSlot = {
  time: string;
  temp: number;
  rain: number;
  sky: SkyKind;
  status: HourStatus;
  isNow: boolean;
};

export type DaySlot = {
  label: string;     // "오늘" | "내일" | "월"·"화" 등
  date: string;      // "5/4" 표기용
  hi: number;
  lo: number;
  rain: number;
  sky: SkyKind;
};

export type WeatherSnapshot = {
  farm: Farm;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    sky: SkyKind;
    pop: number;
    pm10?: number;
    pm10Grade: PmGrade;
    pm10Label: string;
    uv: number;
    uvLabel: string;
    sunrise: string;
    sunset: string;
  };
  hourly: HourSlot[];
  daily: DaySlot[];
  score: {
    work: { score: number; grade: "good" | "ok" | "warn"; reasons: Reason[]; headline: string };
    spray: { value: number; level: "low" | "mid" | "high"; headline: string };
    harvest: { value: number; level: "good" | "ok" | "warn"; headline: string };
  };
  meta: { generatedAt: number };
};

// 오늘의 시간 슬롯. 0시 시작, 3시간 간격으로 21시까지. 자정 직후엔 0시 슬롯이 isNow.
const HOUR_SLOTS = [0, 3, 6, 9, 12, 15, 18, 21];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function indexFcst(items: KmaForecastItem[]) {
  const map = new Map<string, Map<string, string>>();
  for (const it of items) {
    const key = `${it.fcstDate}-${it.fcstTime}`;
    if (!map.has(key)) map.set(key, new Map());
    map.get(key)!.set(it.category, it.fcstValue);
  }
  return map;
}

function indexNcst(items: KmaNcstItem[]) {
  const m = new Map<string, string>();
  for (const it of items) m.set(it.category, it.obsrValue);
  return m;
}

function skyOf(sky: string | undefined, pty: string | undefined, hour: number): SkyKind {
  const isNight = hour >= 19 || hour < 6;
  // PTY: 0 없음 / 1 비 / 2 비/눈 / 3 눈 / 4 소나기
  if (pty === "3") return "snow";
  if (pty === "2") return "sleet";
  if (pty === "1" || pty === "4") return "rain";
  switch (sky) {
    case "1":
      return isNight ? "moon-cloud" : "sun";
    case "3":
      return isNight ? "moon-cloud" : "sun-cloud";
    case "4":
      return "cloud";
    default:
      return "sun-cloud";
  }
}

/** 체감온도 — 단순 공식 (간이 한국형). */
function feelsLike(temp: number, humidity: number, wind: number): number {
  if (temp >= 27 && humidity >= 40) {
    // 고온 다습 — 단순 보정
    return Math.round(temp + (humidity - 40) / 25);
  }
  if (temp <= 10 && wind >= 1.3) {
    // 풍속 냉각
    return Math.round(13.12 + 0.6215 * temp - 11.37 * Math.pow(wind * 3.6, 0.16) + 0.3965 * temp * Math.pow(wind * 3.6, 0.16));
  }
  return Math.round(temp);
}

/** 자외선 — 시각·시즌 기반 단순 추정 (KMA 자외선 OpenAPI 미적용 환경용). */
function estimateUV(date: Date): { uv: number; label: string } {
  const month = date.getMonth() + 1;
  const hour = date.getHours();
  let peak = month <= 2 || month >= 11 ? 3 : month <= 4 || month === 10 ? 6 : 8;
  if (hour < 9 || hour > 17) peak = Math.max(1, Math.floor(peak / 2));
  if (hour >= 11 && hour <= 14) peak = Math.min(11, peak + 1);
  const label =
    peak <= 2 ? "낮음" : peak <= 5 ? "보통" : peak <= 7 ? "높음" : peak <= 10 ? "매우높음" : "위험";
  return { uv: peak, label };
}

function dayLabel(d: Date, base: Date): string {
  const diff = Math.round((d.getTime() - base.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}

/**
 * 서버 환경(UTC) 이든 한국 PC(KST) 든 항상 KST 시각의 Date 를 반환.
 * `.getHours()`, `.getDate()`, `.getMonth()` 등 호출 시 KST 값이 나오도록 보정.
 */
function kstNow(): Date {
  const now = new Date();
  // 로컬 → UTC 보정 + KST(+9h) 추가
  return new Date(now.getTime() + now.getTimezoneOffset() * 60_000 + 9 * 3_600_000);
}

export async function buildSnapshot(farm: Farm): Promise<WeatherSnapshot> {
  const now = kstNow();
  const [fcstItems, ncstItems, sun, air] = await Promise.all([
    fetchVilageFcst(farm.nx, farm.ny),
    fetchUltraSrtNcst(farm.nx, farm.ny),
    fetchSun(farm.lat, farm.lon, now),
    fetchSidoAir(farm.sido),
  ]);

  const ncst = indexNcst(ncstItems);
  const fcst = indexFcst(fcstItems);

  const curTemp = Number(ncst.get("T1H") ?? 22);
  const curHum = Number(ncst.get("REH") ?? 65);
  const curWind = Number(ncst.get("WSD") ?? 2);
  const curPty = ncst.get("PTY") ?? "0";

  // 현재 시각에 가장 가까운 forecast slot 의 SKY 사용 (실황엔 SKY가 없음).
  let curSky: string | undefined;
  let bestDelta = Infinity;
  const nowYmd = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const [key, cats] of fcst) {
    if (!cats.has("SKY")) continue;
    const [d, t] = key.split("-");
    if (d !== nowYmd) continue;
    const slotMin = Number(t.slice(0, 2)) * 60 + Number(t.slice(2, 4));
    const delta = Math.abs(slotMin - nowMin);
    if (delta < bestDelta) {
      bestDelta = delta;
      curSky = cats.get("SKY");
    }
  }
  // fallback: 어떤 SKY든 첫 번째
  if (!curSky) {
    for (const [, cats] of fcst) {
      if (cats.has("SKY")) {
        curSky = cats.get("SKY");
        break;
      }
    }
  }

  const { uv, label: uvLabel } = estimateUV(now);

  // hourly 8개 (00,03,06,09,12,15,18,21) — 모두 오늘 시간
  const today = ymd(now);
  const hourly: HourSlot[] = HOUR_SLOTS.map((h) => {
    const time = `${pad(h)}00`;
    const key = `${today}-${time}`;
    const cats = fcst.get(key);
    const t = Number(cats?.get("TMP") ?? curTemp);
    const r = Number(cats?.get("POP") ?? 10);
    const sk = cats?.get("SKY");
    const pt = cats?.get("PTY") ?? "0";
    const status = hourlyStatus({
      temp: t,
      pop: r,
      windSpeed: Number(cats?.get("WSD") ?? curWind),
      pm10: air.pm10,
      uv,
      hour: h,
    });
    return {
      time: `${pad(h)}시`,
      temp: Math.round(t),
      rain: Math.round(r),
      sky: skyOf(sk, pt, h),
      status,
      isNow: false,
    };
  });

  // 가장 가까운 슬롯에 isNow 부착 — 모두 오늘이라 단순 절대값 거리
  const nowH = now.getHours();
  let nowIdx = 0;
  let smallestDiff = 25;
  hourly.forEach((s, i) => {
    const slotH = parseInt(s.time);
    const diff = Math.abs(slotH - nowH);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      nowIdx = i;
    }
  });
  hourly[nowIdx].isNow = true;

  // 일별 5일 예보 (TMN/TMX)
  const daily: DaySlot[] = [];
  const seen = new Set<string>();
  for (const [key, cats] of fcst) {
    const dateStr = key.split("-")[0];
    if (seen.has(dateStr)) continue;
    if (cats.get("TMN") || cats.get("TMX")) {
      seen.add(dateStr);
    }
  }
  // collect TMN/TMX per day
  const dayMap = new Map<string, { hi?: number; lo?: number; pop: number; sky?: string; pty?: string }>();
  for (const [key, cats] of fcst) {
    const [d] = key.split("-");
    if (!dayMap.has(d)) dayMap.set(d, { pop: 0 });
    const acc = dayMap.get(d)!;
    if (cats.get("TMN")) acc.lo = Math.round(Number(cats.get("TMN")));
    if (cats.get("TMX")) acc.hi = Math.round(Number(cats.get("TMX")));
    const p = Number(cats.get("POP") ?? 0);
    if (p > acc.pop) acc.pop = p;
    if (key.endsWith("1200")) {
      acc.sky = cats.get("SKY");
      acc.pty = cats.get("PTY");
    }
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sortedDates = [...dayMap.keys()].sort();
  for (const d of sortedDates.slice(0, 5)) {
    const dt = new Date(
      Number(d.slice(0, 4)),
      Number(d.slice(4, 6)) - 1,
      Number(d.slice(6, 8))
    );
    const a = dayMap.get(d)!;
    daily.push({
      label: dayLabel(dt, todayStart),
      date: `${dt.getMonth() + 1}/${dt.getDate()}`,
      hi: a.hi ?? Math.round(curTemp + 2),
      lo: a.lo ?? Math.round(curTemp - 6),
      rain: a.pop,
      sky: skyOf(a.sky, a.pty, 12),
    });
  }

  const feels = feelsLike(curTemp, curHum, curWind);
  const curPop = hourly[nowIdx].rain;
  const work = workScore({
    feelsLike: feels,
    pop: curPop,
    windSpeed: curWind,
    pm10: air.pm10,
    uv,
    humidity: curHum,
  });
  const spray = sprayIndex({
    humidity: curHum,
    pop: curPop,
    windSpeed: curWind,
    hourOfDay: nowH,
  });
  const harvest = harvestIndex({
    pop: curPop,
    humidity: curHum,
    windSpeed: curWind,
    uv,
  });

  return {
    farm,
    current: {
      temp: Math.round(curTemp),
      feelsLike: feels,
      humidity: Math.round(curHum),
      windSpeed: Number(curWind.toFixed(1)),
      sky: skyOf(curSky, curPty, nowH),
      pop: curPop,
      pm10: air.pm10,
      pm10Grade: air.pm10Grade,
      pm10Label: PM_LABEL[air.pm10Grade],
      uv,
      uvLabel,
      sunrise: sun.sunrise,
      sunset: sun.sunset,
    },
    hourly,
    daily,
    score: { work, spray, harvest },
    meta: { generatedAt: Date.now() },
  };
}
