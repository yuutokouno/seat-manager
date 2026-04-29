create table attendance_logs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date not null,
  detected_at timestamptz default now() not null,
  unique(user_id, date)
);

alter table attendance_logs enable row level security;

create policy "出社記録は誰でも見られる"
  on attendance_logs for select using (true);

create policy "自分の出社記録だけ作れる"
  on attendance_logs for insert
  with check (auth.uid() = user_id);
