/**
 * 밭일 적합도 점수 계산.
 * - hourlyStatus: 시간별 7세그먼트(best/good/warn/ok)
 * - sprayIndex: 방제 지수 (0~100, 낮을수록 좋음)
 * - harvestIndex: 수확 지수 (0~100, 높을수록 좋음)
 * - workScore: 종합 점수 + 사유 배열 + 한 줄 헤드라인
 *
 * 모든 함수는 순수함수로 작성, lib/weather/normalize.ts와 단위 테스트에서 사용.
 */

export type HourStatus = "good" | "best" | "warn" | "ok";

export type ReasonKey = "wind" | "rain" | "temp" | "pm10" | "uv" | "humidity";
export type ReasonStatus = "ok" | "warn" | "bad";
export type Reason = { key: ReasonKey; status: ReasonStatus; note: string };

export type SprayInput = {
  humidity: number;
  pop: number;
  windSpeed: number;
  hourOfDay: number;
};

export type HarvestInput = {
  pop: number;
  humidity: number;
  windSpeed: number;
  uv: number;
};

export type HourlyStatusInput = {
  temp: number;
  pop: number;
  windSpeed: number;
  pm10?: number;
  uv: number;
  hour: number;
};

export type WorkScoreInput = {
  feelsLike: number;
  pop: number;
  windSpeed: number;
  pm10?: number;
  uv: number;
  humidity: number;
};

/* -------------------------- hourly status (7세그) -------------------------- */

export function hourlyStatus({
  temp,
  pop,
  windSpeed,
  pm10,
  uv,
  hour,
}: HourlyStatusInput): HourStatus {
  const isNight = hour >= 19 || hour < 6;
  const tooHot = temp > 30;
  const tooCold = temp < 3;
  const dust = pm10 ?? 0;

  // 위험 조건이 하나라도 있으면 warn
  if (pop >= 50 || windSpeed >= 8 || tooHot || tooCold || dust > 150) {
    return "warn";
  }

  // 최적 조건 모두 만족 + 낮 시간이면 best
  const isBest =
    pop <= 20 &&
    temp >= 5 &&
    temp <= 26 &&
    windSpeed <= 5 &&
    dust <= 80 &&
    uv <= 7 &&
    !isNight;
  if (isBest) return "best";

  // 밤 시간은 ok 고정
  if (isNight) return "ok";

  // 그 외는 good (낮시간에 살짝 부족)
  return "good";
}

/* ----------------------------- spray index ----------------------------- */

export function sprayIndex({
  humidity,
  pop,
  windSpeed,
  hourOfDay,
}: SprayInput): { value: number; level: "low" | "mid" | "high"; headline: string } {
  let v = 25; // 농지 기본 배경 위험
  const isNight = hourOfDay >= 19 || hourOfDay < 6;

  if (humidity >= 85) v += 30;
  else if (humidity >= 75) v += 15;
  else if (humidity >= 65) v += 5;

  if (pop >= 60) v += 30;
  else if (pop >= 30) v += 10;

  if (windSpeed >= 8) v += 25;
  else if (windSpeed >= 6) v += 15;

  if (isNight) v -= 5;

  v = Math.max(0, Math.min(100, v));
  const level = v >= 60 ? "high" : v >= 40 ? "mid" : "low";

  const headline =
    level === "high"
      ? pop >= 60
        ? "비 가능성 높아 방제 미루세요"
        : "조건 안 좋아 방제 효율 떨어져요"
      : level === "mid"
        ? "조건 보통 — 시간대 잘 골라야 해요"
        : windSpeed <= 5 && pop <= 20
          ? "바람 약하고 비 안 와서 방제 좋아요"
          : "방제 작업 적기예요";

  return { value: v, level, headline };
}

/* ----------------------------- harvest index ----------------------------- */

export function harvestIndex({
  pop,
  humidity,
  windSpeed,
  uv,
}: HarvestInput): { value: number; level: "good" | "ok" | "warn"; headline: string } {
  let v = 30;
  if (pop <= 20) v += 30;
  else if (pop <= 40) v += 15;
  else if (pop >= 60) v -= 25; // 비 오면 수확 곤란

  if (windSpeed <= 5) v += 15;
  else if (windSpeed <= 7) v += 5;
  else v -= 10;

  if (humidity >= 60 && humidity <= 80) v += 20;
  else if (humidity >= 50 && humidity < 90) v += 10;
  else if (humidity >= 90) v -= 5; // 너무 습하면 수확물 변질

  if (uv >= 4 && uv <= 7) v += 10;
  else if (uv <= 3) v += 5;

  v = Math.max(0, Math.min(100, v));
  const level = v >= 70 ? "good" : v >= 40 ? "ok" : "warn";

  const headline =
    level === "good"
      ? "맑은 날씨 이어져 수확 좋아요"
      : level === "ok"
        ? "조건 보통 — 시간대 골라 수확하세요"
        : "날씨 불안정 — 수확 미루는 게 안전해요";

  return { value: v, level, headline };
}

/* ------------------------------ work score ------------------------------ */

export function workScore(input: WorkScoreInput): {
  score: number;
  grade: "good" | "ok" | "warn";
  reasons: Reason[];
  headline: string;
} {
  let score = 100;
  const reasons: Reason[] = [];

  // 체감온도
  if (input.feelsLike < 3 || input.feelsLike > 30) {
    score -= 30;
    reasons.push({
      key: "temp",
      status: "bad",
      note:
        input.feelsLike > 30
          ? `체감 ${input.feelsLike}° — 더위 위험`
          : `체감 ${input.feelsLike}° — 추위 위험`,
    });
  } else if (input.feelsLike < 8 || input.feelsLike > 28) {
    score -= 10;
    reasons.push({
      key: "temp",
      status: "warn",
      note:
        input.feelsLike > 28
          ? `체감 ${input.feelsLike}° — 휴식 자주`
          : `체감 ${input.feelsLike}° — 보온 필수`,
    });
  } else {
    reasons.push({ key: "temp", status: "ok", note: `체감 ${input.feelsLike}° — 일하기 좋아요` });
  }

  // 강수확률
  if (input.pop >= 70) {
    score -= 50;
    reasons.push({ key: "rain", status: "bad", note: `강수확률 ${input.pop}% — 우중작업` });
  } else if (input.pop >= 50) {
    score -= 30;
    reasons.push({ key: "rain", status: "warn", note: `강수확률 ${input.pop}% — 비 가능` });
  } else if (input.pop >= 30) {
    score -= 10;
    reasons.push({ key: "rain", status: "warn", note: `강수확률 ${input.pop}% — 약한 비 주의` });
  } else {
    reasons.push({ key: "rain", status: "ok", note: "비 안 와요" });
  }

  // 풍속
  if (input.windSpeed >= 12) {
    score -= 30;
    reasons.push({ key: "wind", status: "bad", note: `풍속 ${input.windSpeed}m/s — 강풍` });
  } else if (input.windSpeed >= 8) {
    score -= 15;
    reasons.push({
      key: "wind",
      status: "warn",
      note: `풍속 ${input.windSpeed}m/s — 방제 비추천`,
    });
  } else if (input.windSpeed >= 6) {
    score -= 5;
    reasons.push({
      key: "wind",
      status: "warn",
      note: `풍속 ${input.windSpeed}m/s — 살포 효율↓`,
    });
  } else {
    reasons.push({
      key: "wind",
      status: "ok",
      note: `풍속 ${input.windSpeed}m/s — 방제 가능`,
    });
  }

  // 미세먼지
  if (input.pm10 != null) {
    if (input.pm10 > 150) {
      score -= 20;
      reasons.push({ key: "pm10", status: "bad", note: `PM10 ${input.pm10} — 매우나쁨` });
    } else if (input.pm10 > 80) {
      score -= 10;
      reasons.push({ key: "pm10", status: "warn", note: `PM10 ${input.pm10} — 나쁨` });
    } else {
      reasons.push({ key: "pm10", status: "ok", note: "미세먼지 보통" });
    }
  }

  // 자외선
  if (input.uv >= 9) {
    score -= 10;
    reasons.push({ key: "uv", status: "warn", note: `UV ${input.uv} — 모자·토시 권장` });
  } else if (input.uv >= 7) {
    score -= 5;
    reasons.push({ key: "uv", status: "warn", note: `UV ${input.uv} — 자외선 높음` });
  } else {
    reasons.push({ key: "uv", status: "ok", note: `UV ${input.uv} — 무난` });
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 80 ? "good" : score >= 50 ? "ok" : "warn";

  // 헤드라인 — 가장 두드러진 1~2개 사유 결합
  const warns = reasons.filter((r) => r.status !== "ok");
  let headline: string;
  if (grade === "good") {
    if (warns.length === 0) headline = "오늘 밭일하기 아주 좋아요";
    else if (warns.length === 1) headline = `${warns[0].note.split(" — ")[0]}만 주의하면 좋아요`;
    else headline = "전반적으로 좋아요 — 자외선·풍속 정도만 체크";
  } else if (grade === "ok") {
    headline =
      warns
        .slice(0, 2)
        .map((r) => r.note.split(" — ")[0])
        .join(", ") + " 주의";
  } else {
    headline = "오늘은 무리하지 마세요 — " + (warns[0]?.note ?? "조건 안 좋음");
  }

  return { score, grade, reasons, headline };
}
