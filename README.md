# 오늘밭 (Today's Garden)

10년차 밭일을 하는 개인 사용자가 매일 쓰려고 만든 모바일 우선 농사 도우미.

- **출발 전 5초 판단** — 시간별 작업 적합도 + 방제·수확 지수
- **그림과 짧은 단어 위주** — 60대+ 사용자 전제, 텍스트 최소화
- **컨텍스트 자동주입 AI 상담** — 위치·날씨·작물이 이미 들어간 채 질문

## 기술 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | 순수 CSS + Pretendard |
| DB · Storage | Supabase (Postgres + Storage) |
| AI | Google Gemini 3.1 Flash-Lite (`@google/genai`) |
| 위치 | `navigator.geolocation` |
| 날씨 | 기상청 단기예보 (data.go.kr) + Lambert Conformal Conic 격자 변환 |
| 미세먼지 | 에어코리아 시도별 실시간 (data.go.kr) |
| 일출/일몰 | 천문우주지식정보 KASI (data.go.kr) — 미승인 시 천문 근사식 fallback |
| 테스트 | Vitest (점수 계산 boundary 테스트 26개) |

## 시작하기

```bash
npm install
cp .env.example .env.local
# .env.local 을 열어 API 키를 채워 넣으세요
npm run dev
```

`http://localhost:3000` 접속.

### 필요한 API 키

`.env.example` 의 주석을 보면 어디서 발급받는지 한국어로 안내되어 있습니다. 키가 없어도 앱은 mock 데이터로 동작합니다.

| 변수 | 발급처 | 용도 |
|------|-------|------|
| `KMA_SERVICE_KEY` | data.go.kr | 기상청·에어코리아·KASI 통합 |
| `KAKAO_REST_API_KEY` | developers.kakao.com | 좌표 → 한글 주소 |
| `GEMINI_API_KEY` | aistudio.google.com | AI 상담 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | supabase.com | 작물·할 일·사진 저장 |

Supabase 프로젝트 생성 후 `supabase/migrations/0001_init.sql` 의 SQL 을 SQL Editor 에서 실행하세요 (테이블 + Storage 버킷 + 시드).

## 화면 구성

| 탭 | 라우트 | 핵심 |
|---|--------|------|
| 날씨 | `/weather` | 좌측 텍스트 + 우측 일러스트 hero, 6 메트릭(위험 시 주황·빨강), 야외/농사 가이드, 작물 작업 지수, 주간 예보 |
| 시간별 (기본) | `/` | 현재 시각 자동 스크롤되는 7시간 카드, 작업 적합 시간대 7세그먼트 |
| 할 일 | `/tasks` | Supabase 영속화, 체크박스 토글 + 색종이 애니메이션 |
| AI 상담 | `/chat` | Gemini 스트리밍, 사진 첨부(Vision), 전송된 프롬프트 디버그 패널 |

상단 위치 pill 옆 점은 GPS 상태(녹색=적용, 주황=대기, 회색=거부).

## 스크립트

```bash
npm run dev      # Turbopack dev server
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run test     # Vitest 단위 테스트
```

## 구조

```
app/                    # Next.js App Router
  api/                  # weather/work-score/tasks/crops/photos/chat
  weather|tasks|chat|settings/page.tsx
components/             # AppShell, TopBar, icons, useWeather, LocationContext
lib/
  farms.ts              # 단일 밭(삼방리) + 동적 farmAt(lat, lon)
  kma/                  # 기상청 + Lambert 격자
  air/ kasi/            # 에어코리아, KASI
  weather/normalize.ts  # 단일 WeatherSnapshot 빌더
  score/calc.ts         # 점수 계산 (+ vitest 테스트)
  gemini/               # @google/genai 래퍼 + 컨텍스트 빌더
  store/repo.ts         # Supabase ↔ in-memory 자동 분기
supabase/migrations/    # 0001_init.sql
public/illustrations/   # field-1~5.png hero 이미지
```

## 배포

Vercel 추천. 대시보드에서 환경 변수 동일 키 6~7개를 등록하고 배포.
