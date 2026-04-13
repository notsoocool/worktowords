create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id text not null,
  content text not null,
  hashtags text[] not null default '{}',
  goal text not null default 'growth' check (goal in ('job', 'growth', 'authority')),
  created_at timestamptz not null default now()
);

create index if not exists posts_user_id_created_at_idx
  on public.posts (user_id, created_at desc);

create index if not exists posts_user_id_goal_created_at_idx
  on public.posts (user_id, goal, created_at desc);

create table if not exists public.user_settings (
  user_id text primary key,
  default_goal text not null default 'growth' check (default_goal in ('job', 'growth', 'authority')),
  tone text not null default 'professional' check (tone in ('casual', 'professional', 'storytelling')),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_usage (
  user_id text primary key,
  daily_usage int not null default 0,
  last_used_date date,
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_expiry date,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  user_id text primary key,
  payment_id text,
  razorpay_order_id text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_status text not null default 'inactive' check (plan_status in ('inactive', 'active')),
  plan_expiry date,
  amount_paise int not null default 0,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_payment_id_uidx
  on public.user_subscriptions (payment_id)
  where payment_id is not null;

create or replace function public.check_and_increment_usage(p_user_id text)
returns table(
  allowed boolean,
  daily_usage int,
  last_used_date text,
  plan text,
  limit_per_day int
)
language plpgsql
as $$
declare
  v_plan text;
  v_limit int;
  v_today date := current_date;
  v_usage int;
  v_last date;
  v_plan_expiry date;
begin
  insert into public.user_usage (user_id, daily_usage, last_used_date, plan, plan_expiry, updated_at)
  values (p_user_id, 0, v_today, 'free', null, now())
  on conflict (user_id) do update set updated_at = now();

  select u.plan, u.daily_usage, u.last_used_date, u.plan_expiry
    into v_plan, v_usage, v_last, v_plan_expiry
  from public.user_usage as u
  where u.user_id = p_user_id
  for update;

  if v_plan = 'pro' and v_plan_expiry is not null and v_plan_expiry < v_today then
    update public.user_usage as u
      set plan = 'free',
          plan_expiry = null,
          updated_at = now()
      where u.user_id = p_user_id;
    v_plan := 'free';
  end if;

  if v_last is null or v_last <> v_today then
    update public.user_usage as u
      set daily_usage = 0,
          last_used_date = v_today,
          updated_at = now()
      where u.user_id = p_user_id;
    v_usage := 0;
    v_last := v_today;
  end if;

  v_limit := case when v_plan = 'pro' then 100 else 5 end;

  if v_usage >= v_limit then
    return query select false, v_usage, v_last::text, v_plan, v_limit;
    return;
  end if;

  update public.user_usage as u
    set daily_usage = u.daily_usage + 1,
        last_used_date = v_today,
        updated_at = now()
    where u.user_id = p_user_id
    returning u.daily_usage into v_usage;

  return query select true, v_usage, v_last::text, v_plan, v_limit;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.posts to anon, authenticated;
grant select, insert, update on table public.user_settings to anon, authenticated;
grant select, insert, update on table public.user_usage to anon, authenticated;
grant select, insert, update on table public.user_subscriptions to anon, authenticated;
grant execute on function public.check_and_increment_usage(text) to anon, authenticated;

