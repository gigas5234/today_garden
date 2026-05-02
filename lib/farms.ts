import { latLonToGrid } from "./kma/grid";

/**
 * 단일 밭 모드.
 * 기본 좌표는 양평군 옥천면 삼방리 추정값(37.5093, 127.5101).
 * 클라이언트가 navigator.geolocation 으로 받아온 좌표를 location-context 에 반영하면
 * /api/weather/now?lat=&lon= 로 전달돼 더 정확한 지점이 사용된다.
 */

export const FARM = {
  id: "main",
  name: "삼방리 밭",
  lat: 37.5093,
  lon: 127.5101,
  sido: "경기",
} as const;

export type FarmId = typeof FARM.id;

export type Farm = {
  id: FarmId;
  name: string;
  lat: number;
  lon: number;
  /** KMA 동네예보 격자 좌표 (lat/lon 변경되면 재계산). */
  nx: number;
  ny: number;
  sido: string;
};

const baseGrid = latLonToGrid(FARM.lat, FARM.lon);

export const DEFAULT_FARM: Farm = {
  ...FARM,
  nx: baseGrid.nx,
  ny: baseGrid.ny,
};

/** 임의 lat/lon 으로 Farm 객체 생성 (geolocation 콜백 등). */
export function farmAt(lat: number, lon: number, name = FARM.name): Farm {
  const { nx, ny } = latLonToGrid(lat, lon);
  return { id: FARM.id, name, lat, lon, nx, ny, sido: FARM.sido };
}
