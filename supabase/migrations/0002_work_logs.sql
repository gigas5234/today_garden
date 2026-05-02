-- 오늘밭 — 영농일지(work_logs) + 후속 알림(task_followups) + tasks 상태 확장
-- Supabase 대시보드 'SQL Editor' 에서 0001_init.sql 실행 후 통째로 추가 실행하세요.

-- ─────────────── 1) tasks 테이블 확장 ───────────────
alter table tasks
  add column if not exists status text default 'pending',           -- 'pending' | 'done' | 'partial' | 'snoozed' | 'issue_found'
  add column if not exists result_status text,                       -- 'normal' | 'partial' | 'issue_found' | 'needs_followup'
  add column if not exists snooze_reason text,
  add column if not exists task_kind text,                           -- '방제' | '수확' | '물주기' | '북주기' | '곁순제거' | '건조' | 'other'
  add column if not exists issue_type text,                          -- 'pest' | 'disease' | 'drying_problem' | 'growth_problem' | 'weather_damage' | 'other'
  add column if not exists memo text;

-- 기존 row 의 status 추정: done_at 있으면 done, 없으면 pending
update tasks set status = 'done' where status = 'pending' and done_at is not null;

create index if not exists tasks_status_idx on tasks (status, due_at);

-- ─────────────── 2) 영농일지 ───────────────
-- task 완료 시 자동 insert. 작업 결과 + 그 시점 날씨 스냅샷 일부를 영구 보존.
create table if not exists work_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  farm_id uuid references farms(id) on delete cascade,
  crop_id uuid references crops(id) on delete set null,
  title text not null,                                                -- task.title 복사
  result_status text,                                                 -- 'normal' | 'partial' | 'issue_found' | 'needs_followup'
  memo text,
  weather_snapshot jsonb,                                             -- { temp, humidity, windSpeed, pop, sky } 등 핵심만 저장
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists work_logs_farm_idx on work_logs (farm_id, occurred_at desc);
create index if not exists work_logs_crop_idx on work_logs (crop_id, occurred_at desc);

-- ─────────────── 3) 후속 알림 (자동 생성된 followup task 추적) ───────────────
-- 룰 베이스로 만들어진 다음 task 와 원본 task 의 연결.
create table if not exists task_followups (
  id uuid primary key default gen_random_uuid(),
  source_task_id uuid references tasks(id) on delete cascade,         -- 어느 task 가 트리거했는지
  next_task_id uuid references tasks(id) on delete cascade,           -- 자동 생성된 다음 task
  rule_kind text not null,                                            -- '방제' | '수확' | '물주기' 등 룰 키
  rule_days int not null,                                             -- 며칠 후 due_at
  created_at timestamptz default now()
);

create index if not exists task_followups_source_idx on task_followups (source_task_id);

-- ─────────────── 끝 ───────────────
-- 필요한 테이블 모두 생성됨. 사진 첨부는 의도적으로 제외.
