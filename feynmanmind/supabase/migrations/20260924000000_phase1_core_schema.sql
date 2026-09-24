-- =============================================================================
-- FeynmanMind — Phase 1 core schema
-- Tables, constraints, indexes, triggers and Row Level Security.
--
-- Ownership model:
--   subjects.user_id is the root of ownership for concepts and feynman_sessions.
--   flashcards and card_reviews also carry user_id so the "due cards" queue
--   can be read with a single indexed filter; triggers stop that
--   copied user_id from drifting away from the real owner.
-- =============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Helpers that must not be callable over PostgREST live in their own schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- subjects
-- -----------------------------------------------------------------------------
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  created_at  timestamptz not null default now(),

  constraint subjects_user_title_key unique (user_id, title)
);

create index subjects_user_id_idx on public.subjects (user_id);

-- -----------------------------------------------------------------------------
-- concepts
-- -----------------------------------------------------------------------------
create table public.concepts (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references public.subjects (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  -- 0–100, updated from the latest comprehension_score (see trigger below).
  mastery_level  smallint not null default 0 check (mastery_level between 0 and 100),
  created_at     timestamptz not null default now(),

  constraint concepts_subject_title_key unique (subject_id, title)
);

create index concepts_subject_id_idx on public.concepts (subject_id);

-- -----------------------------------------------------------------------------
-- feynman_sessions  (one row per explanation attempt; append-only)
-- -----------------------------------------------------------------------------
create table public.feynman_sessions (
  id                   uuid primary key default gen_random_uuid(),
  concept_id           uuid not null references public.concepts (id) on delete cascade,
  user_explanation     text not null check (char_length(user_explanation) between 1 and 8000),
  -- [{ "term": "...", "why_problematic": "...", "plain_language_hint": "..." }]
  jargon_detected      jsonb not null default '[]'::jsonb
                            check (jsonb_typeof(jargon_detected) = 'array'),
  -- [{ "user_quote": "...", "issue_area": "..." }] — never contains the correction.
  misconceptions       jsonb not null default '[]'::jsonb
                            check (jsonb_typeof(misconceptions) = 'array'),
  socratic_question    text,
  comprehension_score  smallint check (comprehension_score between 0 and 100),
  created_at           timestamptz not null default now()
);

create index feynman_sessions_concept_created_idx
  on public.feynman_sessions (concept_id, created_at desc);

-- -----------------------------------------------------------------------------
-- flashcards
-- -----------------------------------------------------------------------------
create table public.flashcards (
  id          uuid primary key default gen_random_uuid(),
  concept_id  uuid not null references public.concepts (id) on delete cascade,
  user_id     uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  question    text not null check (char_length(btrim(question)) between 1 and 1000),
  answer      text not null check (char_length(btrim(answer)) between 1 and 2000),
  created_at  timestamptz not null default now(),

  -- Stops the generator from inserting the same card twice for one concept.
  constraint flashcards_concept_question_key unique (concept_id, question)
);

create index flashcards_concept_id_idx on public.flashcards (concept_id);
create index flashcards_user_id_idx    on public.flashcards (user_id);

-- -----------------------------------------------------------------------------
-- card_reviews  (current SM-2 scheduling state; exactly one row per card)
-- -----------------------------------------------------------------------------
create table public.card_reviews (
  id                uuid primary key default gen_random_uuid(),
  card_id           uuid not null references public.flashcards (id) on delete cascade,
  user_id           uuid not null default auth.uid()
                         references auth.users (id) on delete cascade,
  easiness_factor   numeric(4,2) not null default 2.50 check (easiness_factor >= 1.30),
  interval_days     integer      not null default 0    check (interval_days >= 0),
  repetitions       integer      not null default 0    check (repetitions >= 0),
  next_review_date  timestamptz  not null default now(),
  last_reviewed_at  timestamptz,

  constraint card_reviews_card_id_key unique (card_id)
);

-- Powers "what is due for me now?":
--   select ... where user_id = auth.uid() and next_review_date <= now()
create index card_reviews_user_due_idx
  on public.card_reviews (user_id, next_review_date);

-- =============================================================================
-- Ownership helpers (SECURITY DEFINER so RLS policies can call them without
-- recursive RLS checks; search_path pinned to prevent hijacking).
-- =============================================================================
create or replace function private.owns_subject(p_subject_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.subjects s
    where s.id = p_subject_id and s.user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_concept(p_concept_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.concepts c
    join public.subjects s on s.id = c.subject_id
    where c.id = p_concept_id and s.user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_flashcard(p_card_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.flashcards f
    where f.id = p_card_id and f.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_subject(uuid)   from public;
revoke all on function private.owns_concept(uuid)   from public;
revoke all on function private.owns_flashcard(uuid) from public;
grant execute on function private.owns_subject(uuid)   to authenticated;
grant execute on function private.owns_concept(uuid)   to authenticated;
grant execute on function private.owns_flashcard(uuid) to authenticated;

-- =============================================================================
-- Integrity triggers
-- =============================================================================

-- flashcards.user_id must be the owner of the concept's subject. Also covers
-- service-role inserts (e.g. the flashcard-generator Edge Function) where RLS
-- is bypassed.
create or replace function private.flashcards_enforce_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select s.user_id into v_owner
  from public.concepts c
  join public.subjects s on s.id = c.subject_id
  where c.id = new.concept_id;

  if v_owner is null then
    raise exception 'concept % not found', new.concept_id using errcode = '23503';
  end if;
  if new.user_id is distinct from v_owner then
    raise exception 'flashcard user_id must match concept owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger flashcards_enforce_owner
  before insert or update of concept_id, user_id on public.flashcards
  for each row execute function private.flashcards_enforce_owner();

-- Every new flashcard gets its SM-2 state row, due immediately.
create or replace function private.flashcards_init_review()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.card_reviews (card_id, user_id)
  values (new.id, new.user_id)
  on conflict (card_id) do nothing;
  return new;
end;
$$;

create trigger flashcards_init_review
  after insert on public.flashcards
  for each row execute function private.flashcards_init_review();

-- card_reviews.user_id must match the card's owner, and card_id is immutable.
create or replace function private.card_reviews_enforce_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'UPDATE' and new.card_id is distinct from old.card_id then
    raise exception 'card_reviews.card_id is immutable' using errcode = '42501';
  end if;

  select f.user_id into v_owner from public.flashcards f where f.id = new.card_id;
  if new.user_id is distinct from v_owner then
    raise exception 'card_review user_id must match flashcard owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger card_reviews_enforce_owner
  before insert or update on public.card_reviews
  for each row execute function private.card_reviews_enforce_owner();

-- Keep concepts.mastery_level in sync with the newest scored Feynman session.
create or replace function private.feynman_sessions_update_mastery()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.comprehension_score is not null then
    update public.concepts
       set mastery_level = new.comprehension_score
     where id = new.concept_id;
  end if;
  return new;
end;
$$;

create trigger feynman_sessions_update_mastery
  after insert or update of comprehension_score on public.feynman_sessions
  for each row execute function private.feynman_sessions_update_mastery();

-- =============================================================================
-- Row Level Security
-- `(select auth.uid())` is wrapped so Postgres evaluates it once per statement.
-- =============================================================================
alter table public.subjects         enable row level security;
alter table public.concepts         enable row level security;
alter table public.feynman_sessions enable row level security;
alter table public.flashcards       enable row level security;
alter table public.card_reviews     enable row level security;

-- subjects -------------------------------------------------------------------
create policy "subjects: owner select" on public.subjects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "subjects: owner insert" on public.subjects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "subjects: owner update" on public.subjects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "subjects: owner delete" on public.subjects
  for delete to authenticated using (user_id = (select auth.uid()));

-- concepts -------------------------------------------------------------------
create policy "concepts: owner select" on public.concepts
  for select to authenticated using ((select private.owns_subject(subject_id)));
create policy "concepts: owner insert" on public.concepts
  for insert to authenticated with check ((select private.owns_subject(subject_id)));
create policy "concepts: owner update" on public.concepts
  for update to authenticated
  using ((select private.owns_subject(subject_id)))
  with check ((select private.owns_subject(subject_id)));
create policy "concepts: owner delete" on public.concepts
  for delete to authenticated using ((select private.owns_subject(subject_id)));

-- feynman_sessions -----------------------------------------------------------
-- Read/insert/delete only. AI fields are written by the Edge Function
-- (service role), so clients get no UPDATE policy and cannot forge scores.
create policy "feynman_sessions: owner select" on public.feynman_sessions
  for select to authenticated using ((select private.owns_concept(concept_id)));
create policy "feynman_sessions: owner delete" on public.feynman_sessions
  for delete to authenticated using ((select private.owns_concept(concept_id)));
-- Clients may insert only the raw explanation; the Edge Function scores it.
create policy "feynman_sessions: owner insert" on public.feynman_sessions
  for insert to authenticated
  with check (
    (select private.owns_concept(concept_id))
    and comprehension_score is null
    and socratic_question is null
    and jargon_detected = '[]'::jsonb
    and misconceptions = '[]'::jsonb
  );

-- flashcards -----------------------------------------------------------------
create policy "flashcards: owner select" on public.flashcards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "flashcards: owner insert" on public.flashcards
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.owns_concept(concept_id)));
create policy "flashcards: owner update" on public.flashcards
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.owns_concept(concept_id)));
create policy "flashcards: owner delete" on public.flashcards
  for delete to authenticated using (user_id = (select auth.uid()));

-- card_reviews ---------------------------------------------------------------
-- Rows are created by trigger and removed by cascade, so clients get
-- SELECT + UPDATE only (to write the result of calculateNextReview).
create policy "card_reviews: owner select" on public.card_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "card_reviews: owner update" on public.card_reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.owns_flashcard(card_id)));

-- =============================================================================
-- Grants (Supabase grants broad defaults; make the intended surface explicit)
-- =============================================================================
revoke all on public.subjects, public.concepts, public.feynman_sessions,
              public.flashcards, public.card_reviews from anon;

grant select, insert, update, delete on public.subjects   to authenticated;
grant select, insert, update, delete on public.concepts   to authenticated;
grant select, insert, update, delete on public.flashcards to authenticated;
grant select, insert, delete         on public.feynman_sessions to authenticated;
revoke update on public.feynman_sessions from authenticated;
grant select, update                 on public.card_reviews to authenticated;
revoke insert, delete on public.card_reviews from authenticated;
