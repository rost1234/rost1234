-- =============================================================================
-- FeynmanMind — review history, atomic review submission, dashboard stats
-- =============================================================================

-- -----------------------------------------------------------------------------
-- review_logs  (append-only history; card_reviews only holds current state)
-- -----------------------------------------------------------------------------
create table public.review_logs (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references public.flashcards (id) on delete cascade,
  user_id          uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,
  quality          smallint not null check (quality between 0 and 5),
  easiness_factor  numeric(4,2) not null check (easiness_factor >= 1.30),
  interval_days    integer not null check (interval_days >= 0),
  reviewed_at      timestamptz not null default now()
);

create index review_logs_user_reviewed_idx on public.review_logs (user_id, reviewed_at desc);
create index review_logs_card_idx on public.review_logs (card_id);

alter table public.review_logs enable row level security;

create policy "review_logs: owner select" on public.review_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "review_logs: owner insert" on public.review_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.owns_flashcard(card_id)));

revoke all on public.review_logs from anon;
grant select, insert on public.review_logs to authenticated;

-- -----------------------------------------------------------------------------
-- submit_card_review: stores the SM-2 result computed by the client and logs
-- the review in one transaction. Optimistic concurrency: the update only
-- applies if last_reviewed_at still equals what the client saw, so the same
-- card graded on two devices is only counted once. Returns false on conflict.
-- SECURITY INVOKER: RLS on both tables still applies.
-- -----------------------------------------------------------------------------
create or replace function public.submit_card_review(
  p_review_id                 uuid,
  p_expected_last_reviewed_at timestamptz,
  p_quality                   smallint,
  p_easiness_factor           numeric,
  p_interval_days             integer,
  p_repetitions               integer,
  p_next_review_date          timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_card_id uuid;
begin
  if p_quality is null or p_quality not between 0 and 5 then
    raise exception 'quality must be between 0 and 5' using errcode = '22023';
  end if;

  update public.card_reviews
     set easiness_factor  = p_easiness_factor,
         interval_days    = p_interval_days,
         repetitions      = p_repetitions,
         next_review_date = p_next_review_date,
         last_reviewed_at = now()
   where id = p_review_id
     and last_reviewed_at is not distinct from p_expected_last_reviewed_at
  returning card_id into v_card_id;

  if v_card_id is null then
    return false;
  end if;

  insert into public.review_logs (card_id, user_id, quality, easiness_factor, interval_days)
  values (v_card_id, (select auth.uid()), p_quality, p_easiness_factor, p_interval_days);

  return true;
end;
$$;

revoke all on function public.submit_card_review(uuid, timestamptz, smallint, numeric, integer, integer, timestamptz) from public, anon;
grant execute on function public.submit_card_review(uuid, timestamptz, smallint, numeric, integer, integer, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- get_study_stats: everything the Today dashboard needs in one round trip.
-- Day boundaries use the caller's IANA time zone (falls back to UTC).
-- -----------------------------------------------------------------------------
create or replace function public.get_study_stats(p_tz text default 'UTC')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz        text := case
                        when exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then p_tz
                        else 'UTC'
                      end;
  v_uid       uuid := (select auth.uid());
  v_today     date := (now() at time zone v_tz)::date;
  v_day_end   timestamptz := ((v_today + 1)::timestamp at time zone v_tz);
  v_streak    integer := 0;
  v_cursor    date;
  v_result    jsonb;
begin
  -- Streak: consecutive local days with at least one review, ending today
  -- (or yesterday, so the streak isn't shown as lost before today's session).
  v_cursor := v_today;
  if not exists (
    select 1 from public.review_logs
    where user_id = v_uid and (reviewed_at at time zone v_tz)::date = v_cursor
  ) then
    v_cursor := v_today - 1;
  end if;
  loop
    exit when not exists (
      select 1 from public.review_logs
      where user_id = v_uid
        and reviewed_at >= (v_cursor::timestamp at time zone v_tz)
        and reviewed_at <  ((v_cursor + 1)::timestamp at time zone v_tz)
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  select jsonb_build_object(
    'due_now',        (select count(*) from public.card_reviews where user_id = v_uid and next_review_date <= now()),
    'due_today',      (select count(*) from public.card_reviews where user_id = v_uid and next_review_date < v_day_end),
    'reviewed_today', (select count(*) from public.review_logs
                        where user_id = v_uid and reviewed_at >= (v_today::timestamp at time zone v_tz)),
    'correct_today',  (select count(*) from public.review_logs
                        where user_id = v_uid and quality >= 3
                          and reviewed_at >= (v_today::timestamp at time zone v_tz)),
    'streak_days',    v_streak,
    'total_cards',    (select count(*) from public.flashcards where user_id = v_uid),
    'total_concepts', (select count(*) from public.concepts c join public.subjects s on s.id = c.subject_id
                        where s.user_id = v_uid),
    'avg_mastery',    (select coalesce(round(avg(c.mastery_level)), 0) from public.concepts c
                        join public.subjects s on s.id = c.subject_id where s.user_id = v_uid),
    -- Cards falling due on each of the next 7 local days (day 0 includes overdue).
    'forecast', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'count', (
               select count(*) from public.card_reviews r
               where r.user_id = v_uid
                 and r.next_review_date < ((d::date + 1)::timestamp at time zone v_tz)
                 and (d::date = v_today or r.next_review_date >= (d::date::timestamp at time zone v_tz))
             )) order by d)
      from generate_series(v_today, v_today + 6, interval '1 day') d
    ),
    -- Reviews done on each of the last 7 local days.
    'history', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'count', (
               select count(*) from public.review_logs l
               where l.user_id = v_uid
                 and l.reviewed_at >= (d::date::timestamp at time zone v_tz)
                 and l.reviewed_at <  ((d::date + 1)::timestamp at time zone v_tz)
             )) order by d)
      from generate_series(v_today - 6, v_today, interval '1 day') d
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_study_stats(text) from public, anon;
grant execute on function public.get_study_stats(text) to authenticated;
