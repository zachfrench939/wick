-- Reference copy of the Wick score comparison schema.
-- This is already applied on the Supabase project. It is kept here so the
-- browser client and the database stay documented together.
--
-- public.daily_scores is insert-only for the anon role (row level security).
-- public.daily_distribution(p_day) and public.daily_rank(p_day, p_score)
-- are wrappers over private security-definer functions.
-- pg_cron deletes rows older than 12 months.

create table if not exists public.daily_scores (
  id bigint generated always as identity primary key,
  day integer not null check (day >= 1),
  score integer not null check (score >= 0 and score <= 100),
  device_id uuid not null,
  created_at timestamptz not null default now(),
  constraint daily_scores_day_device_id_key unique (day, device_id)
);

alter table public.daily_scores enable row level security;

drop policy if exists daily_scores_insert_anon on public.daily_scores;
create policy daily_scores_insert_anon
  on public.daily_scores
  for insert
  to anon
  with check (
    day >= 1
    and score >= 0
    and score <= 100
    and device_id is not null
  );

revoke all on table public.daily_scores from anon, authenticated;
grant insert on table public.daily_scores to anon;

create schema if not exists private;

create or replace function private.daily_distribution(p_day integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', count(*),
    'average', avg(score),
    'p50', percentile_cont(0.50) within group (order by score),
    'p75', percentile_cont(0.75) within group (order by score),
    'p90', percentile_cont(0.90) within group (order by score),
    'p95', percentile_cont(0.95) within group (order by score),
    'p99', percentile_cont(0.99) within group (order by score)
  )
  from public.daily_scores
  where day = p_day;
$$;

create or replace function public.daily_distribution(p_day integer)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.daily_distribution(p_day);
$$;

create or replace function private.daily_rank(p_day integer, p_score integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', count(*),
    'fraction', case
      when count(*) = 0 then 0
      else count(*) filter (where score < p_score)::numeric / count(*)
    end
  )
  from public.daily_scores
  where day = p_day;
$$;

create or replace function public.daily_rank(p_day integer, p_score integer)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.daily_rank(p_day, p_score);
$$;

revoke all on function public.daily_distribution(integer) from public;
revoke all on function public.daily_rank(integer, integer) from public;
grant execute on function public.daily_distribution(integer) to anon;
grant execute on function public.daily_rank(integer, integer) to anon;

-- Rows older than 12 months are removed automatically.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'wick-delete-daily-scores-older-than-12-months',
  '15 3 * * *',
  $$delete from public.daily_scores where created_at < now() - interval '12 months'$$
);
