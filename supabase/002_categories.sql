-- Wick category scores. Apply this in the Supabase SQL editor.
-- It is backward-compatible: old rows become category 'mixed', and a call
-- that sends only p_day still means every score that day.
-- The anon role can still only insert. It cannot read the table.
-- After it runs, reload the API schema if scores do not appear:
--   notify pgrst, 'reload schema';

alter table public.daily_scores
  add column if not exists category text not null default 'mixed';

update public.daily_scores
set category = 'mixed'
where category is null;

alter table public.daily_scores
  drop constraint if exists daily_scores_category_check;

alter table public.daily_scores
  add constraint daily_scores_category_check
  check (category in (
    'mixed',
    'geography',
    'history',
    'science',
    'nature',
    'space',
    'film',
    'music',
    'sport',
    'food',
    'language',
    'art',
    'tech'
  ));

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'daily_scores'
      and con.contype = 'u'
  loop
    execute format('alter table public.daily_scores drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.daily_scores
  add constraint daily_scores_day_category_device_id_key
  unique (day, category, device_id);

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
    and category in (
      'mixed',
      'geography',
      'history',
      'science',
      'nature',
      'space',
      'film',
      'music',
      'sport',
      'food',
      'language',
      'art',
      'tech'
    )
  );

revoke all on table public.daily_scores from anon, authenticated;
grant insert on table public.daily_scores to anon;

drop function if exists public.daily_distribution(integer);
drop function if exists public.daily_rank(integer, integer);
drop function if exists private.daily_distribution(integer);
drop function if exists private.daily_rank(integer, integer);

create or replace function private.daily_distribution(p_day integer, p_category text default null)
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
  where day = p_day
    and (p_category is null or category = p_category);
$$;

create or replace function public.daily_distribution(p_day integer, p_category text default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.daily_distribution(p_day, p_category);
$$;

create or replace function private.daily_rank(p_day integer, p_score integer, p_category text default null)
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
  where day = p_day
    and (p_category is null or category = p_category);
$$;

create or replace function public.daily_rank(p_day integer, p_score integer, p_category text default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.daily_rank(p_day, p_score, p_category);
$$;

revoke all on function public.daily_distribution(integer, text) from public;
revoke all on function public.daily_rank(integer, integer, text) from public;
grant execute on function public.daily_distribution(integer, text) to anon;
grant execute on function public.daily_rank(integer, integer, text) to anon;

notify pgrst, 'reload schema';
