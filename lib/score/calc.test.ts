import { describe, expect, it } from "vitest";
import {
  harvestIndex,
  hourlyStatus,
  sprayIndex,
  workScore,
} from "./calc";

describe("hourlyStatus", () => {
  it("최적 조건 — 낮시간, 모든 변수 좋음", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 2, pm10: 40, uv: 5, hour: 12 })
    ).toBe("best");
  });

  it("밤 시간은 항상 ok (warn 조건 없으면)", () => {
    expect(
      hourlyStatus({ temp: 18, pop: 10, windSpeed: 2, pm10: 40, uv: 0, hour: 22 })
    ).toBe("ok");
  });

  it("강수확률 50% 경계 — warn", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 50, windSpeed: 2, pm10: 40, uv: 5, hour: 12 })
    ).toBe("warn");
  });

  it("풍속 8m/s 경계 — warn", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 8, pm10: 40, uv: 5, hour: 12 })
    ).toBe("warn");
  });

  it("체감 30° 초과 — warn (더위)", () => {
    expect(
      hourlyStatus({ temp: 31, pop: 10, windSpeed: 2, pm10: 40, uv: 5, hour: 12 })
    ).toBe("warn");
  });

  it("체감 3° 미만 — warn (추위)", () => {
    expect(
      hourlyStatus({ temp: 2, pop: 10, windSpeed: 2, pm10: 40, uv: 5, hour: 12 })
    ).toBe("warn");
  });

  it("PM10 150 초과 — warn", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 2, pm10: 151, uv: 5, hour: 12 })
    ).toBe("warn");
  });

  it("UV 8 — best 탈락하고 good", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 2, pm10: 40, uv: 8, hour: 12 })
    ).toBe("good");
  });

  it("PM10 81~150 — best 탈락하고 good", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 2, pm10: 100, uv: 5, hour: 12 })
    ).toBe("good");
  });

  it("PM10 미상 — best 정상 동작", () => {
    expect(
      hourlyStatus({ temp: 22, pop: 10, windSpeed: 2, uv: 5, hour: 12 })
    ).toBe("best");
  });
});

describe("sprayIndex", () => {
  it("정상 조건 (낮·습도65·약풍·맑음) — 낮음", () => {
    const r = sprayIndex({ humidity: 65, pop: 10, windSpeed: 2, hourOfDay: 12 });
    expect(r.level).toBe("low");
    expect(r.value).toBeLessThan(40);
  });

  it("습도 85% + 강수 60% — 높음", () => {
    const r = sprayIndex({ humidity: 85, pop: 60, windSpeed: 2, hourOfDay: 12 });
    expect(r.level).toBe("high");
    expect(r.value).toBeGreaterThanOrEqual(60);
    expect(r.headline).toMatch(/방제 미루세요|효율 떨어져요/);
  });

  it("강풍 8m/s — 높음 추가", () => {
    const r = sprayIndex({ humidity: 65, pop: 10, windSpeed: 9, hourOfDay: 12 });
    expect(r.value).toBeGreaterThan(40);
  });

  it("야간은 -5", () => {
    const day = sprayIndex({ humidity: 65, pop: 10, windSpeed: 2, hourOfDay: 12 });
    const night = sprayIndex({ humidity: 65, pop: 10, windSpeed: 2, hourOfDay: 22 });
    expect(night.value).toBe(day.value - 5);
  });

  it("값은 0~100 범위로 클램프", () => {
    const r = sprayIndex({ humidity: 100, pop: 100, windSpeed: 20, hourOfDay: 12 });
    expect(r.value).toBeLessThanOrEqual(100);
  });
});

describe("harvestIndex", () => {
  it("이상 조건 — 좋음", () => {
    const r = harvestIndex({ pop: 10, humidity: 65, windSpeed: 2, uv: 5 });
    expect(r.level).toBe("good");
    expect(r.value).toBeGreaterThanOrEqual(70);
  });

  it("강수 70% — 주의", () => {
    const r = harvestIndex({ pop: 70, humidity: 90, windSpeed: 4, uv: 2 });
    expect(r.level).toBe("warn");
  });

  it("값은 0~100 범위로 클램프", () => {
    const r = harvestIndex({ pop: 0, humidity: 70, windSpeed: 0, uv: 5 });
    expect(r.value).toBeLessThanOrEqual(100);
  });
});

describe("workScore", () => {
  const baseGood = {
    feelsLike: 22,
    pop: 10,
    windSpeed: 2,
    pm10: 40,
    uv: 5,
    humidity: 65,
  };

  it("이상 조건 — 100점, good", () => {
    const r = workScore(baseGood);
    expect(r.score).toBe(100);
    expect(r.grade).toBe("good");
    expect(r.headline).toMatch(/아주 좋아요|좋아요/);
  });

  it("UV 8 — 5점 감점, 사유에 자외선 추가", () => {
    const r = workScore({ ...baseGood, uv: 8 });
    expect(r.score).toBe(95);
    expect(r.reasons.find((x) => x.key === "uv")?.status).toBe("warn");
  });

  it("강수 70% — 50점 감점, warn 등급으로 떨어짐", () => {
    const r = workScore({ ...baseGood, pop: 70 });
    expect(r.score).toBe(50);
    expect(r.grade).toBe("ok");
    expect(r.reasons.find((x) => x.key === "rain")?.status).toBe("bad");
  });

  it("강풍 12m/s — 30점 감점", () => {
    const r = workScore({ ...baseGood, windSpeed: 12 });
    expect(r.score).toBe(70);
  });

  it("PM10 200 — 20점 감점", () => {
    const r = workScore({ ...baseGood, pm10: 200 });
    expect(r.score).toBe(80);
  });

  it("체감 35° — 30점 감점, 헤드라인에 더위 위험 반영", () => {
    const r = workScore({ ...baseGood, feelsLike: 35 });
    expect(r.score).toBe(70);
    expect(r.reasons.find((x) => x.key === "temp")?.status).toBe("bad");
  });

  it("최악 조건 — 0점으로 클램프, warn 등급", () => {
    const r = workScore({
      feelsLike: 38,
      pop: 80,
      windSpeed: 15,
      pm10: 250,
      uv: 11,
      humidity: 95,
    });
    expect(r.score).toBe(0);
    expect(r.grade).toBe("warn");
  });

  it("PM10 미상 — 사유에 미세먼지 항목 빠짐", () => {
    const r = workScore({ ...baseGood, pm10: undefined });
    expect(r.reasons.find((x) => x.key === "pm10")).toBeUndefined();
  });
});
