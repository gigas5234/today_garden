/**
 * 일출일몰 — KASI 출몰시각 정보(data.go.kr) 우선, 실패 시 천문 근사식.
 * 근사식은 실측 대비 ±1~2분 오차로, UI 표기 용도로 충분.
 */

const KASI_BASE = "https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService";
const SERVICE_KEY = process.env.KASI_SERVICE_KEY ?? process.env.KMA_SERVICE_KEY;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export type SunInfo = {
  sunrise: string;
  sunset: string;
  /** 'kasi' = data.go.kr 응답 사용, 'computed' = 천문 근사식. */
  source: "kasi" | "computed";
};

export async function fetchSun(lat: number, lon: number, date = new Date()): Promise<SunInfo> {
  if (!SERVICE_KEY) return compute(lat, lon, date);
  const locdate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const sp = new URLSearchParams({
    locdate,
    longitude: String(lon),
    latitude: String(lat),
  });
  try {
    const url = `${KASI_BASE}/getAreaRiseSetInfo?serviceKey=${SERVICE_KEY}&${sp.toString()}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      console.warn(`[KASI] HTTP ${res.status} — using astronomical fallback`);
      return compute(lat, lon, date);
    }
    const text = await res.text();
    const sunrise = match(text, "sunrise");
    const sunset = match(text, "sunset");
    if (!sunrise || !sunset) return compute(lat, lon, date);
    return { sunrise: fmt(sunrise), sunset: fmt(sunset), source: "kasi" };
  } catch (e) {
    console.warn("[KASI] exception", e);
    return compute(lat, lon, date);
  }
}

function match(xml: string, tag: string) {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return m?.[1]?.trim();
}

function fmt(hhmm: string) {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

function compute(lat: number, lon: number, date: Date): SunInfo {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const P = Math.asin(0.39795 * Math.cos(0.98563 * (day - 173) * (Math.PI / 180)));
  const argument =
    (Math.sin((-0.83 * Math.PI) / 180) - Math.sin((lat * Math.PI) / 180) * Math.sin(P)) /
    (Math.cos((lat * Math.PI) / 180) * Math.cos(P));
  const haDeg = (Math.acos(Math.max(-1, Math.min(1, argument))) * 180) / Math.PI;
  const noon = 12 + (135 - lon) / 15; // KST 표준 자오선 보정
  return {
    sunrise: hhmm(noon - haDeg / 15),
    sunset: hhmm(noon + haDeg / 15),
    source: "computed",
  };
}

function hhmm(h: number) {
  const total = Math.round(h * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
