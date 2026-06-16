-- FeedFlow Database Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- Preferences (more of / less of categories)
create table public.preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  preference_type text not null check (preference_type in ('more', 'less')),
  created_at timestamp with time zone default now(),
  unique(user_id, category, preference_type)
);

-- Instagram connection status
create table public.instagram_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'connecting')),
  ig_username text,
  ig_session_data jsonb, -- encrypted session/cookie data for automation
  last_sync timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Automation status (active/paused per user)
create table public.automation_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Automation activity logs (for analytics/dashboard)
create table public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  action_type text not null, -- 'like', 'follow', 'search', 'view'
  category text, -- which preference category this action was for
  target text, -- hashtag/post/account targeted
  status text default 'success' check (status in ('success', 'failed')),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.instagram_connections enable row level security;
alter table public.automation_settings enable row level security;
alter table public.automation_logs enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage own preferences" on public.preferences
  for all using (auth.uid() = user_id);

create policy "Users can manage own ig connection" on public.instagram_connections
  for all using (auth.uid() = user_id);

create policy "Users can manage own automation settings" on public.automation_settings
  for all using (auth.uid() = user_id);

create policy "Users can view own logs" on public.automation_logs
  for select using (auth.uid() = user_id);

create policy "Service role can insert logs" on public.automation_logs
  for insert with check (true);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  insert into public.automation_settings (user_id, is_active)
  values (new.id, false);

  insert into public.instagram_connections (user_id, status)
  values (new.id, 'disconnected');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable realtime for automation_logs and automation_settings (for live dashboard updates)
alter publication supabase_realtime add table public.automation_logs;
alter publication supabase_realtime add table public.automation_settings;
alter publication supabase_realtime add table public.instagram_connections;
