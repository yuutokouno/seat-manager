-- =====================
-- 1. profiles テーブル
-- =====================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  role text default 'member'
);

alter table profiles enable row level security;

create policy "誰でもプロフィールを見られる"
  on profiles for select using (true);

create policy "自分または管理者がプロフィールを更新できる"
  on profiles for update
  using (
    auth.uid() = id
    or (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Google OAuth でサインアップしたとき、自動で profiles に行を作るトリガー
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================
-- 2. seats テーブル
-- =====================
create table seats (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  floor text,
  x integer default 0,
  y integer default 0
);

alter table seats enable row level security;

create policy "誰でも席を見られる"
  on seats for select using (true);

create policy "管理者だけ席を追加できる"
  on seats for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "管理者だけ席を更新できる"
  on seats for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "管理者だけ席を削除できる"
  on seats for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- =====================
-- 3. seat_sessions テーブル
-- =====================
create table seat_sessions (
  id uuid default gen_random_uuid() primary key,
  seat_id uuid references seats(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz
);

alter table seat_sessions enable row level security;

create unique index idx_one_active_session_per_user
  on seat_sessions(user_id) where ended_at is null;

create unique index idx_one_active_session_per_seat
  on seat_sessions(seat_id) where ended_at is null;

create policy "着席状況は誰でも見られる"
  on seat_sessions for select using (true);

create policy "自分の着席だけ作れる"
  on seat_sessions for insert
  with check (auth.uid() = user_id);

create policy "自分の着席だけ終了できる"
  on seat_sessions for update
  using (auth.uid() = user_id);

-- =====================
-- 4. floor_labels テーブル
-- =====================
create table floor_labels (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  x integer default 0,
  y integer default 0,
  width integer default 120,
  height integer default 60
);

alter table floor_labels enable row level security;

create policy "誰でもラベルを見られる"
  on floor_labels for select using (true);

create policy "管理者だけラベルを追加できる"
  on floor_labels for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "管理者だけラベルを更新できる"
  on floor_labels for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "管理者だけラベルを削除できる"
  on floor_labels for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- =====================
-- 5. seat_reservations テーブル
-- =====================
create table seat_reservations (
  id uuid default gen_random_uuid() primary key,
  seat_id uuid references seats(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  seated boolean default false,
  canceled_at timestamptz,
  cancel_type text,
  created_at timestamptz default now() not null
);

alter table seat_reservations enable row level security;

create unique index idx_one_reservation_per_seat_time
  on seat_reservations(seat_id, starts_at) where canceled_at is null;

create policy "誰でも予約を見られる"
  on seat_reservations for select using (true);

create policy "自分の予約だけ作れる"
  on seat_reservations for insert
  with check (auth.uid() = user_id);

create policy "自分の予約だけ取り消せる"
  on seat_reservations for update
  using (auth.uid() = user_id);

-- =====================
-- 6. Realtime 有効化
-- =====================
alter publication supabase_realtime add table seat_sessions;
alter publication supabase_realtime add table seat_reservations;

-- =====================
-- 7. テスト用の席データ
-- =====================
insert into seats (name, x, y) values
  ('A-1', 40, 40),
  ('A-2', 140, 40),
  ('A-3', 240, 40),
  ('A-4', 340, 40),
  ('A-5', 440, 40),
  ('B-1', 40, 140),
  ('B-2', 140, 140),
  ('B-3', 240, 140),
  ('B-4', 340, 140),
  ('B-5', 440, 140);
