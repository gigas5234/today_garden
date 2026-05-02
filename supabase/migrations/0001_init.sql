-- 오늘밭 — 초기 스키마
-- Supabase 대시보드 'SQL Editor' 에서 통째로 실행하세요.
-- 인증은 사용하지 않으며(개인용 — URL 비공개), RLS는 끈 채로 운영합니다.
-- 쓰기는 서버 라우트(service_role)에서만 발생합니다.

-- ─────────────── 1) 밭 ───────────────
create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- 'ypg' | 'gpg' | 'yj' | 'home' 등
  name text not null,                        -- '양평 밭'
  lat double precision not null,
  lon double precision not null,
  address text,
  kma_nx int not null,
  kma_ny int not null,
  air_sido text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create index if not exists farms_slug_idx on farms (slug);

-- ─────────────── 2) 작물 ───────────────
create table if not exists crops (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  name text not null,                        -- '고추'
  variety text,                              -- '청양'
  planted_at date,
  expected_harvest_at date,
  optimal_temp_min int,
  optimal_temp_max int,
  optimal_humidity_min int,
  optimal_humidity_max int,
  notes text,
  archived_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists crops_farm_idx on crops (farm_id);

-- ─────────────── 3) 작물 사진 (일지 대용) ───────────────
create table if not exists crop_photos (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references crops(id) on delete cascade,
  storage_path text not null,                -- 'crops/<crop_id>/<filename>'
  memo text,
  taken_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists crop_photos_crop_idx on crop_photos (crop_id);

-- ─────────────── 4) 할 일 ───────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  crop_id uuid references crops(id) on delete set null,
  title text not null,
  description text,
  priority text default 'mid',               -- 'high' | 'mid' | 'low'
  trigger_type text default 'date',          -- 'date' | 'days_after_planting' | 'weather'
  trigger_payload jsonb,
  due_at date,
  done_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists tasks_farm_idx on tasks (farm_id, done_at);
create index if not exists tasks_due_idx on tasks (due_at);

-- ─────────────── 5) 챗 메시지 (M5에서 사용) ───────────────
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null,                        -- 'user' | 'model'
  text text not null,
  context_snapshot jsonb,
  parts jsonb,
  created_at timestamptz default now()
);

create index if not exists chat_messages_created_idx on chat_messages (created_at desc);

-- ─────────────── 6) Storage 버킷 ───────────────
-- Supabase 대시보드 'Storage' → 'New bucket' 으로 만들거나, 아래 RPC 사용:
--   public 으로 할지 private 으로 할지는 취향이지만, 개인용이라 private 권장.
insert into storage.buckets (id, name, public)
values ('crop-photos', 'crop-photos', false)
on conflict (id) do nothing;

-- ─────────────── 7) 시드 — 밭 4곳 ───────────────
-- lib/farms.ts 와 동일한 좌표/격자.
insert into farms (slug, name, lat, lon, kma_nx, kma_ny, air_sido, is_default)
values
  ('main', '삼방리',   37.5093, 127.5101, 70, 126, '경기', true)
on conflict (slug) do nothing;
