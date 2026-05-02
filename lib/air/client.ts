/**
 * 에어코리아 시도별 실시간 측정정보 조회.
 * 인증키 또는 API 응답 누락 시 undefined 그레이드 — 호출부에서 "보통" 기본값 처리.
 */

const AIR_BASE = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc";
const SERVICE_KEY = process.env.AIRKOREA_SERVICE_KEY ?? process.env.KMA_SERVICE_KEY;

export type AirItem = {
  stationName: string;
  pm10Value?: string;
  pm10Grade?: string;
  pm25Value?: string;
  pm25Grade?: string;
  o3Value?: string;
};

export type PmGrade = "good" | "ok" | "warn" | "bad";

const GRADE_MAP: Record<string, PmGrade> = {
  "1": "good",
  "2": "ok",
  "3": "warn",
  "4": "bad",
};

export const PM_LABEL: Record<PmGrade, string> = {
  good: "좋음",
  ok: "보통",
  warn: "나쁨",
  bad: "매우나쁨",
};

export type AirSnapshot = {
  pm10?: number;
  pm10Grade: PmGrade;
  pm25?: number;
  pm25Grade: PmGrade;
  station?: string;
};

const UNKNOWN: AirSnapshot = { pm10Grade: "ok", pm25Grade: "ok" };

export async function fetchSidoAir(sidoName: string): Promise<AirSnapshot> {
  if (!SERVICE_KEY) {
    console.warn("[AIR] skipped — service key missing");
    return UNKNOWN;
  }
  const sp = new URLSearchParams({
    sidoName,
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    ver: "1.3",
  });
  try {
    const url = `${AIR_BASE}/getCtprvnRltmMesureDnsty?serviceKey=${SERVICE_KEY}&${sp.toString()}`;
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) {
      console.warn(`[AIR] HTTP ${res.status}`);
      return UNKNOWN;
    }
    const json = await res.json();
    const items: AirItem[] = json?.response?.body?.items ?? [];
    const valid = items.find((i) => i.pm10Value && i.pm10Value !== "-");
    if (!valid) return UNKNOWN;
    return {
      pm10: Number(valid.pm10Value),
      pm10Grade: GRADE_MAP[valid.pm10Grade ?? "2"] ?? "ok",
      pm25: valid.pm25Value ? Number(valid.pm25Value) : undefined,
      pm25Grade: GRADE_MAP[valid.pm25Grade ?? "2"] ?? "ok",
      station: valid.stationName,
    };
  } catch (e) {
    console.warn("[AIR] exception", e);
    return UNKNOWN;
  }
}
