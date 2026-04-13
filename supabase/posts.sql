create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id text not null,
  content text not null,
  hashtags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists posts_user_id_created_at_idx
  on public.posts (user_id, created_at desc);

create table if not exists public.user_settings (
  user_id text primary key,
  default_goal text not null default 'growth' check (default_goal in ('job', 'growth', 'authority')),
  tone text not null default 'professional' check (tone in ('casual', 'professional', 'storytelling')),
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert on table public.posts to anon, authenticated;
grant select, insert, update on table public.user_settings to anon, authenticated;

