/**
 * 기상청 동네예보(단기예보 + 초단기실황) OpenAPI 클라이언트.
 *
 * 단기예보 발표 시각: 02·05·08·11·14·17·20·23시 (each release at HH10).
 * 초단기실황 발표 시각: 매시간 30분 (40분부터 사용 가능).
 *
 * 인증키 미설정 시 fetch* 함수는 빈 배열을 반환 — 호출부(normalize.ts)가 안전하게 처리.
 */

const KMA_BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

const VILAGE_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

export type KmaForecastItem = {
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
};

export type KmaNcstItem = {
  baseDate: string;
  baseTime: string;
  category: string;
  obsrValue: string;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function kstNow(): Date {
  const n = new Date();
  return new Date(n.getTime() + n.getTimezoneOffset() * 60_000 + 9 * 3_600_000);
}

/** 단기예보용 base_date / base_time (직전 발표 시각, KST 기준). */
export function vilageBase(now = kstNow()): { base_date: string; base_time: string } {
  const d = new Date(now);
  // 발표는 HH:10. 안전 마진 20분 빼서 HH:30 이전엔 직전 슬롯 사용.
  if (d.getMinutes() < 30) d.setHours(d.getHours() - 1);
  const h = d.getHours();
  let pick = -1;
  for (let i = VILAGE_BASE_HOURS.length - 1; i >= 0; i--) {
    if (h >= VILAGE_BASE_HOURS[i]) {
      pick = VILAGE_BASE_HOURS[i];
      break;
    }
  }
  if (pick === -1) {
    // 자정 직후 → 전날 23시 슬롯
    d.setDate(d.getDate() - 1);
    pick = 23;
  }
  return { base_date: ymd(d), base_time: `${pad(pick)}00` };
}

/** 초단기실황용 base_date / base_time (직전 정시, KST 기준). */
export function ncstBase(now = kstNow()): { base_date: string; base_time: string } {
  const d = new Date(now);
  if (d.getMinutes() < 40) d.setHours(d.getHours() - 1);
  return { base_date: ymd(d), base_time: `${pad(d.getHours())}00` };
}

const SERVICE_KEY = process.env.KMA_SERVICE_KEY;

async function kmaFetch(path: string, params: Record<string, string | number>) {
  if (!SERVICE_KEY) {
    console.warn(`[KMA] ${path} skipped — KMA_SERVICE_KEY missing`);
    return [];
  }
  // serviceKey 는 data.go.kr 의 'Encoding' 키(이미 URL 인코딩됨) — URLSearchParams 로 감싸면 이중 인코딩되어 401.
  const sp = new URLSearchParams({
    dataType: "JSON",
    pageNo: "1",
    numOfRows: "1000",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const url = `${KMA_BASE}/${path}?serviceKey=${SERVICE_KEY}&${sp.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) {
      console.warn(`[KMA] ${path} HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    const code = json?.response?.header?.resultCode ?? json?.cmmMsgHeader?.returnReasonCode;
    if (code && code !== "00") {
      console.warn(`[KMA] ${path} resultCode=${code}`);
      return [];
    }
    const items = json?.response?.body?.items?.item;
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.warn(`[KMA] ${path} exception`, e);
    return [];
  }
}

export async function fetchVilageFcst(nx: number, ny: number): Promise<KmaForecastItem[]> {
  const { base_date, base_time } = vilageBase();
  return (await kmaFetch("getVilageFcst", { base_date, base_time, nx, ny })) as KmaForecastItem[];
}

export async function fetchUltraSrtNcst(nx: number, ny: number): Promise<KmaNcstItem[]> {
  const { base_date, base_time } = ncstBase();
  return (await kmaFetch("getUltraSrtNcst", { base_date, base_time, nx, ny })) as KmaNcstItem[];
}
