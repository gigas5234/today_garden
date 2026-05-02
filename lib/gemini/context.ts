/**
 * 챗봇 사용자 메시지 직전에 붙이는 [현재 상황] 컨텍스트 빌더.
 * 위치 + 날씨 스냅샷 + 점수 + 등록 작물 + 오늘 미완료 task 를 한 블록으로 묶는다.
 */

import { Farm } from "../farms";
import { listCrops, listTasks } from "../store/repo";
import { buildSnapshot, WeatherSnapshot } from "../weather/normalize";

export type ChatContext = {
  text: string;          // [현재 상황] 헤더 텍스트
  snapshot: WeatherSnapshot;
  pills: string[];       // 화면 상단 컨텍스트 칩에 그대로 사용 가능
};

export async function buildChatContext(farm: Farm): Promise<ChatContext> {
  const [snap, crops, tasks] = await Promise.all([
    buildSnapshot(farm),
    listCrops(farm.id),
    listTasks(farm.id),
  ]);

  const c = snap.current;
  const todayPending = tasks.filter((t) => !t.done_at);
  const cropMap = new Map(crops.map((x) => [x.id, x]));

  const cropLines =
    crops.length === 0
      ? "- (등록된 작물 없음 — 일반론으로 답해도 됨)"
      : crops
          .map((cr) => {
            const planted = cr.planted_at ? `, 정식 ${cr.planted_at}` : "";
            const variety = cr.variety ? `(${cr.variety})` : "";
            return `- ${cr.name}${variety}${planted}`;
          })
          .join("\n");

  const taskLines =
    todayPending.length === 0
      ? "- (미완료 할 일 없음)"
      : todayPending
          .map((t) => {
            const cropName = t.crop_id ? cropMap.get(t.crop_id)?.name : "밭 전체";
            return `- [${cropName ?? "밭"}] ${t.title}${t.priority === "high" ? " (우선)" : ""}`;
          })
          .join("\n");

  const reasonLine = snap.score.work.reasons
    .filter((r) => r.status !== "ok")
    .map((r) => r.note)
    .join(", ");

  const now = new Date();
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const text =
    `[현재 상황 ${ymd} ${hm}]\n` +
    `위치: ${farm.name} (lat ${farm.lat}, lon ${farm.lon})\n` +
    `기온 ${c.temp}°(체감 ${c.feelsLike}°), 습도 ${c.humidity}%, 풍속 ${c.windSpeed}m/s, 강수확률 ${c.pop}%\n` +
    `미세먼지 ${c.pm10Label}${c.pm10 != null ? ` (PM10 ${c.pm10})` : ""}, 자외선 ${c.uv} (${c.uvLabel})\n` +
    `일출 ${c.sunrise} · 일몰 ${c.sunset}\n` +
    `밭일 적합도 ${snap.score.work.score}점 (${snap.score.work.grade})${reasonLine ? ` — ${reasonLine}` : ""}\n` +
    `방제 지수 ${snap.score.spray.value}(${snap.score.spray.level}), 수확 지수 ${snap.score.harvest.value}(${snap.score.harvest.level})\n` +
    `시간별 적합: ${snap.hourly.map((h) => `${h.time}=${h.status}`).join(" ")}\n\n` +
    `[등록 작물]\n${cropLines}\n\n` +
    `[오늘 남은 할 일]\n${taskLines}\n`;

  const pills: string[] = [
    `#강수확률_${c.pop}%`,
    `#습도_${c.humidity}%`,
    `#UV_${c.uv}`,
    ...crops.slice(0, 3).map((cr) => `#${cr.name}`),
  ];

  return { text, snapshot: snap, pills };
}
