/**
 * 챗봇 사용자 메시지 직전에 붙이는 컨텍스트 빌더.
 *
 * 새 포맷(2026-05):
 *   [참고자료 안내]
 *   [현재 상황]      — 날짜/시간/위치/날씨 수치
 *   [작업 판단 지수] — 적합도/방제/수확/시간별
 *   [등록 작물]
 *   [오늘 남은 할 일]
 *
 * 필드명 매핑 (현재 코드 타입 기준):
 *   - cr.notes  ← 사용자 스니펫의 cr.memo
 *   - t.description ← 사용자 스니펫의 t.note
 *   - t.priority "mid" ← "보통" 라벨로 매핑
 *   - h.rain ← 강수확률(%)로 출력
 */

import { Farm } from "../farms";
import { listCrops, listTasks, type Task } from "../store/repo";
import { buildSnapshot, WeatherSnapshot } from "../weather/normalize";

export type ChatContext = {
  text: string;
  snapshot: WeatherSnapshot;
  pills: string[];
};

function priorityLabel(p: Task["priority"]): string {
  switch (p) {
    case "high":
      return "우선순위 높음";
    case "low":
      return "우선순위 낮음";
    case "mid":
    default:
      return "우선순위 보통";
  }
}

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
      ? "- 등록된 작물 없음. 현재 상황과 질문만 기준으로 답변."
      : crops
          .map((cr) => {
            const planted = cr.planted_at ? `, 정식 ${cr.planted_at}` : "";
            const variety = cr.variety ? `(${cr.variety})` : "";
            const memo = cr.notes ? `, 메모: ${cr.notes}` : "";
            return `- ${cr.name}${variety}${planted}${memo}`;
          })
          .join("\n");

  const taskLines =
    todayPending.length === 0
      ? "- 미완료 할 일 없음."
      : todayPending
          .map((t) => {
            const cropName = t.crop_id ? cropMap.get(t.crop_id)?.name : "밭 전체";
            const due = t.due_at ? `, 권장/마감: ${t.due_at}` : "";
            const note = t.description ? `, 메모: ${t.description}` : "";
            return `- [${cropName ?? "밭"}] ${t.title} (${priorityLabel(t.priority)}${due}${note})`;
          })
          .join("\n");

  const reasonLine = snap.score.work.reasons
    .filter((r) => r.status !== "ok")
    .map((r) => r.note)
    .join(", ");

  // 시각 표기는 normalize.ts 가 이미 KST 기준으로 buildSnapshot 했으므로
  // 여기서도 같은 기준 — KST 변환된 Date 사용.
  const nowUtc = new Date();
  const now = new Date(
    nowUtc.getTime() + nowUtc.getTimezoneOffset() * 60_000 + 9 * 3_600_000
  );
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;

  const hourlyLine =
    snap.hourly?.length > 0
      ? snap.hourly
          .map((h) => {
            const temp = h.temp != null ? `, ${h.temp}℃` : "";
            // h.rain 은 강수확률(%) — 모델 가독성 위해 '강수' 라벨 사용
            const pop = h.rain != null ? `, 강수 ${h.rain}%` : "";
            return `${h.time}=${h.status}${temp}${pop}`;
          })
          .join(" / ")
      : "시간별 적합도 없음";

  const text =
    `[참고자료 안내]\n` +
    `아래 정보는 사용자의 밭 상황이다. 질문과 관련 있을 때만 반영하고, 무관하면 억지로 사용하지 않는다.\n\n` +
    `[현재 상황]\n` +
    `날짜: ${ymd}\n` +
    `현재 시간: ${hm}\n` +
    `위치: ${farm.name} (lat ${farm.lat}, lon ${farm.lon})\n` +
    `기온: ${c.temp}℃\n` +
    `체감온도: ${c.feelsLike}℃\n` +
    `습도: ${c.humidity}%\n` +
    `풍속: ${c.windSpeed}m/s\n` +
    `강수확률: ${c.pop}%\n` +
    `미세먼지: ${c.pm10Label}${c.pm10 != null ? ` (PM10 ${c.pm10})` : ""}\n` +
    `자외선: ${c.uv} (${c.uvLabel})\n` +
    `일출: ${c.sunrise}\n` +
    `일몰: ${c.sunset}\n\n` +
    `[작업 판단 지수]\n` +
    `밭일 적합도: ${snap.score.work.score}점 (${snap.score.work.grade})${
      reasonLine ? ` — ${reasonLine}` : ""
    }\n` +
    `방제 지수: ${snap.score.spray.value} (${snap.score.spray.level})\n` +
    `수확 지수: ${snap.score.harvest.value} (${snap.score.harvest.level})\n` +
    `시간별 적합도: ${hourlyLine}\n\n` +
    `[등록 작물]\n${cropLines}\n\n` +
    `[오늘 남은 할 일]\n${taskLines}\n`;

  const pills: string[] = [
    `#강수확률_${c.pop}%`,
    `#습도_${c.humidity}%`,
    `#UV_${c.uv}`,
    `#풍속_${c.windSpeed}m/s`,
    ...crops.slice(0, 3).map((cr) => `#${cr.name}`),
  ];

  return { text, snapshot: snap, pills };
}

/** 사진 첨부 시 사용자 프롬프트 직전에 추가하는 안내 블록. */
export function buildImageNotice(hasImage: boolean): string {
  if (!hasImage) return "";
  return (
    `[첨부 이미지]\n` +
    `사용자가 이미지를 첨부했다. 사진의 잎 색, 반점, 해충 흔적, 줄기 상태, 열매 상태를 우선 확인한다. ` +
    `사진만으로 확정이 어려우면 가능성으로 말한다.\n\n`
  );
}
