-- =============================================================================
-- Atman Yoga — schema inicial
-- Sistema de gestão de estúdio de ioga com 3 perfis: admin, professor, aluno.
-- Postgres 17 / Supabase (auth.users como fonte de identidade)
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- =============================================================================
-- 1. TIPOS
-- =============================================================================

create type public.app_role         as enum ('admin', 'teacher', 'student');
create type public.class_level      as enum ('todos', 'iniciante', 'intermediario', 'avancado');
create type public.session_status   as enum ('scheduled', 'completed', 'canceled');
create type public.booking_status   as enum ('booked', 'waitlisted', 'attended', 'no_show', 'canceled');
create type public.subscription_status as enum ('pending', 'active', 'paused', 'expired', 'canceled');
create type public.payment_status   as enum ('pending', 'paid', 'overdue', 'refunded', 'canceled');
create type public.payment_method   as enum ('pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'other');
create type public.plan_period      as enum ('single', 'pack', 'monthly', 'quarterly', 'semiannual', 'annual');

-- =============================================================================
-- 2. IDENTIDADE E PERFIS
-- =============================================================================

-- Perfil 1:1 com auth.users. Criado por trigger no signup.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  email         text,
  phone         text,
  avatar_url    text,
  birth_date    date,
  document_id   text,                       -- CPF
  address       jsonb,                      -- { street, number, city, state, zip }
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Dados cadastrais de qualquer usuário (admin, professor ou aluno).';

-- Papéis separados do perfil: um professor também pode ser aluno.
create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is 'Papéis do usuário. Composto para permitir múltiplos papéis.';

-- Dados exclusivos de professor
create table public.teachers (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  bio          text,
  specialties  text[] not null default '{}',
  certifications text[] not null default '{}',
  session_rate numeric(10,2),               -- valor por aula ministrada (repasse)
  hired_at     date,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Dados exclusivos de aluno
create table public.students (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  emergency_contact jsonb,                  -- { name, phone, relationship }
  health_notes      text,                   -- lesões, restrições, condições
  goals             text,
  experience_level  public.class_level not null default 'iniciante',
  how_found_us      text,
  start_date        date not null default current_date,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================================================
-- 3. CATÁLOGO: MODALIDADES E SALAS
-- =============================================================================

create table public.modalities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,     -- Hatha, Vinyasa, Yin, Meditação...
  slug             text not null unique,
  description      text,
  color            text,                     -- hex para a agenda
  default_duration_min integer not null default 60 check (default_duration_min > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  capacity   integer not null check (capacity > 0),
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 4. GRADE HORÁRIA (template recorrente) E SESSÕES (ocorrências)
-- =============================================================================

create table public.class_schedules (
  id            uuid primary key default gen_random_uuid(),
  modality_id   uuid not null references public.modalities (id) on delete restrict,
  teacher_id    uuid not null references public.teachers (profile_id) on delete restrict,
  room_id       uuid references public.rooms (id) on delete set null,
  weekday       smallint not null check (weekday between 0 and 6),  -- 0 = domingo (extract(dow))
  start_time    time not null,
  duration_min  integer not null default 60 check (duration_min > 0),
  capacity      integer not null check (capacity > 0),
  level         public.class_level not null default 'todos',
  valid_from    date not null default current_date,
  valid_until   date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.class_schedules is 'Aula recorrente da grade. Ex: Vinyasa toda terça 19h.';

create index on public.class_schedules (weekday, start_time) where is_active;
create index on public.class_schedules (teacher_id);

-- Ocorrência concreta de uma aula, em uma data. É o que o aluno agenda.
create table public.class_sessions (
  id           uuid primary key default gen_random_uuid(),
  schedule_id  uuid references public.class_schedules (id) on delete set null,
  modality_id  uuid not null references public.modalities (id) on delete restrict,
  teacher_id   uuid not null references public.teachers (profile_id) on delete restrict, -- pode ser substituto
  room_id      uuid references public.rooms (id) on delete set null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  capacity     integer not null check (capacity > 0),
  level        public.class_level not null default 'todos',
  status       public.session_status not null default 'scheduled',
  cancel_reason text,
  teacher_notes text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index on public.class_sessions (starts_at);
create index on public.class_sessions (teacher_id, starts_at);
create unique index class_sessions_schedule_date_uniq
  on public.class_sessions (schedule_id, starts_at) where schedule_id is not null;

-- Duas sessões não podem ocupar a mesma sala ao mesmo tempo (ignora canceladas).
alter table public.class_sessions
  add constraint class_sessions_room_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'canceled' and room_id is not null);

-- =============================================================================
-- 5. PLANOS, MATRÍCULAS E CRÉDITOS
-- =============================================================================

create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  description       text,
  price             numeric(10,2) not null check (price >= 0),
  period            public.plan_period not null,
  duration_days     integer check (duration_days > 0),  -- validade; null = usa period
  class_credits     integer check (class_credits >= 0), -- null = ilimitado
  credits_per_week  integer check (credits_per_week >= 0), -- limite semanal opcional
  allowed_modalities uuid[] not null default '{}',      -- vazio = todas
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.plans.class_credits is 'Nº de aulas no período. NULL = ilimitado.';

create table public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (profile_id) on delete cascade,
  plan_id         uuid not null references public.plans (id) on delete restrict,
  status          public.subscription_status not null default 'pending',
  starts_on       date not null default current_date,
  ends_on         date,
  price_charged   numeric(10,2) not null check (price_charged >= 0),
  credits_total   integer,                  -- snapshot do plano; null = ilimitado
  credits_used    integer not null default 0 check (credits_used >= 0),
  auto_renew      boolean not null default false,
  canceled_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index on public.subscriptions (student_id, status);
create index on public.subscriptions (ends_on) where status = 'active';

-- Razão de cada movimento de crédito (auditoria).
create table public.credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  booking_id      uuid,                     -- FK adicionada após bookings
  delta           integer not null,         -- -1 consome, +1 estorna
  reason          text not null,
  created_at      timestamptz not null default now()
);

create index on public.credit_ledger (subscription_id);

-- =============================================================================
-- 6. AGENDAMENTOS / PRESENÇA
-- =============================================================================

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.class_sessions (id) on delete cascade,
  student_id      uuid not null references public.students (profile_id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  status          public.booking_status not null default 'booked',
  waitlist_pos    integer,
  booked_at       timestamptz not null default now(),
  canceled_at     timestamptz,
  cancel_reason   text,
  checked_in_at   timestamptz,
  checked_in_by   uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (session_id, student_id)
);

create index on public.bookings (student_id, status);
create index on public.bookings (session_id) where status in ('booked', 'attended');

alter table public.credit_ledger
  add constraint credit_ledger_booking_fk
  foreign key (booking_id) references public.bookings (id) on delete set null;

-- =============================================================================
-- 7. FINANCEIRO
-- =============================================================================

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (profile_id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount          numeric(10,2) not null check (amount >= 0),
  status          public.payment_status not null default 'pending',
  method          public.payment_method,
  due_date        date not null,
  paid_at         timestamptz,
  external_id     text,                     -- id no gateway (Asaas, Pagar.me, Stripe...)
  receipt_url     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.payments (student_id, status);
create index on public.payments (due_date) where status in ('pending', 'overdue');

-- Repasse ao professor pelas aulas ministradas.
create table public.teacher_payouts (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.teachers (profile_id) on delete restrict,
  period_start  date not null,
  period_end    date not null,
  sessions_count integer not null default 0 check (sessions_count >= 0),
  amount        numeric(10,2) not null check (amount >= 0),
  status        public.payment_status not null default 'pending',
  paid_at       timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (period_end >= period_start)
);

create index on public.teacher_payouts (teacher_id, period_start);

-- =============================================================================
-- 8. COMUNICAÇÃO
-- =============================================================================

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete restrict,
  title         text not null,
  body          text not null,
  audience      public.app_role[] not null default array['student','teacher']::public.app_role[],
  is_pinned     boolean not null default false,
  published_at  timestamptz not null default now(),
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index on public.announcements (published_at desc);

-- =============================================================================
-- 9. FUNÇÕES DE APOIO (security definer — evitam recursão de RLS)
-- =============================================================================

create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin');
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('teacher');
$$;

create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('student');
$$;

-- Professor tem vínculo com o aluno se o aluno já agendou alguma aula dele.
create or replace function public.teaches_student(target_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.bookings b
    join public.class_sessions s on s.id = b.session_id
    where b.student_id = target_student
      and s.teacher_id = auth.uid()
  );
$$;

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','teachers','students','class_schedules','class_sessions',
    'plans','subscriptions','bookings','payments','teacher_payouts'
  ] loop
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- Cria profile + papel padrão no signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desired_role public.app_role;
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );

  -- Papel vem do metadata; qualquer valor inválido ou 'admin' vira 'student'.
  -- Promoção a admin/teacher é feita por um admin, nunca no self-signup.
  desired_role := case new.raw_user_meta_data ->> 'role'
                    when 'teacher' then 'teacher'::public.app_role
                    else 'student'::public.app_role
                  end;

  insert into public.user_roles (user_id, role) values (new.id, desired_role);

  if desired_role = 'student' then
    insert into public.students (profile_id) values (new.id);
  else
    insert into public.teachers (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 10. REGRAS DE NEGÓCIO
-- =============================================================================

-- Gera sessões concretas a partir da grade, para um intervalo de datas.
-- Idempotente: o índice único (schedule_id, starts_at) protege reexecuções.
create or replace function public.generate_sessions(range_start date, range_end date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  created_count integer := 0;
  sch record;
  d date;
begin
  if not public.is_admin() then
    raise exception 'apenas admin pode gerar sessões';
  end if;

  for sch in
    select * from public.class_schedules
    where is_active
      and valid_from <= range_end
      and (valid_until is null or valid_until >= range_start)
  loop
    for d in select generate_series(range_start, range_end, '1 day')::date loop
      continue when extract(dow from d)::smallint <> sch.weekday;
      continue when d < sch.valid_from;
      continue when sch.valid_until is not null and d > sch.valid_until;

      insert into public.class_sessions
        (schedule_id, modality_id, teacher_id, room_id, starts_at, ends_at, capacity, level)
      values (
        sch.id, sch.modality_id, sch.teacher_id, sch.room_id,
        (d + sch.start_time) at time zone 'America/Sao_Paulo',
        (d + sch.start_time) at time zone 'America/Sao_Paulo' + make_interval(mins => sch.duration_min),
        sch.capacity, sch.level
      )
      on conflict do nothing;

      created_count := created_count + 1;
    end loop;
  end loop;

  return created_count;
end;
$$;

-- Lotação: manda para lista de espera quando a turma está cheia.
create or replace function public.enforce_session_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  occupied integer;
  cap integer;
  sess_status public.session_status;
  sess_start timestamptz;
begin
  if new.status not in ('booked', 'waitlisted') then
    return new;
  end if;

  select capacity, status, starts_at into cap, sess_status, sess_start
  from public.class_sessions where id = new.session_id
  for update;

  if sess_status = 'canceled' then
    raise exception 'aula cancelada, não aceita agendamento';
  end if;

  if sess_start < now() and not public.is_admin() then
    raise exception 'aula já começou';
  end if;

  select count(*) into occupied
  from public.bookings
  where session_id = new.session_id
    and status in ('booked', 'attended')
    and (tg_op = 'INSERT' or id <> new.id);

  if occupied >= cap then
    new.status := 'waitlisted';
    select coalesce(max(waitlist_pos), 0) + 1 into new.waitlist_pos
    from public.bookings where session_id = new.session_id and status = 'waitlisted';
  else
    new.status := 'booked';
    new.waitlist_pos := null;
  end if;

  return new;
end;
$$;

create trigger bookings_capacity
  before insert or update of status on public.bookings
  for each row execute function public.enforce_session_capacity();

-- Consome/estorna crédito da matrícula conforme o agendamento muda de estado.
create or replace function public.sync_booking_credits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sub record;
begin
  if new.subscription_id is null then
    return new;
  end if;

  select * into sub from public.subscriptions where id = new.subscription_id for update;

  if sub.credits_total is null then          -- plano ilimitado
    return new;
  end if;

  -- Consome ao criar/reativar
  if (tg_op = 'INSERT' and new.status in ('booked', 'waitlisted'))
     or (tg_op = 'UPDATE' and old.status = 'canceled' and new.status in ('booked', 'waitlisted')) then

    if sub.credits_used >= sub.credits_total then
      raise exception 'créditos esgotados no plano do aluno';
    end if;

    update public.subscriptions set credits_used = credits_used + 1 where id = sub.id;
    insert into public.credit_ledger (subscription_id, booking_id, delta, reason)
    values (sub.id, new.id, -1, 'agendamento');

  -- Estorna ao cancelar (no_show não estorna)
  elsif tg_op = 'UPDATE' and old.status in ('booked', 'waitlisted') and new.status = 'canceled' then
    update public.subscriptions set credits_used = greatest(credits_used - 1, 0) where id = sub.id;
    insert into public.credit_ledger (subscription_id, booking_id, delta, reason)
    values (sub.id, new.id, 1, 'cancelamento');
  end if;

  return new;
end;
$$;

create trigger bookings_credits
  after insert or update of status on public.bookings
  for each row execute function public.sync_booking_credits();

-- Marca matrículas vencidas (chamar via cron diário).
create or replace function public.expire_subscriptions()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.subscriptions
  set status = 'expired'
  where status = 'active' and ends_on is not null and ends_on < current_date;
  get diagnostics n = row_count;

  update public.payments
  set status = 'overdue'
  where status = 'pending' and due_date < current_date;

  return n;
end;
$$;

-- =============================================================================
-- 11. VIEWS
-- =============================================================================

create or replace view public.v_session_availability
with (security_invoker = true) as
select
  s.id                as session_id,
  s.starts_at,
  s.ends_at,
  s.status,
  s.level,
  m.name              as modality,
  m.color             as modality_color,
  r.name              as room,
  p.full_name         as teacher_name,
  s.teacher_id,
  s.capacity,
  count(b.id) filter (where b.status in ('booked', 'attended')) as booked_count,
  s.capacity - count(b.id) filter (where b.status in ('booked', 'attended')) as spots_left,
  count(b.id) filter (where b.status = 'waitlisted') as waitlist_count
from public.class_sessions s
join public.modalities m on m.id = s.modality_id
join public.profiles  p on p.id = s.teacher_id
left join public.rooms r on r.id = s.room_id
left join public.bookings b on b.session_id = s.id
group by s.id, m.name, m.color, r.name, p.full_name;

create or replace view public.v_student_overview
with (security_invoker = true) as
select
  st.profile_id,
  p.full_name,
  p.email,
  p.phone,
  st.is_active,
  sub.id                as subscription_id,
  pl.name               as plan_name,
  sub.status            as subscription_status,
  sub.ends_on,
  sub.credits_total,
  sub.credits_used,
  case when sub.credits_total is null then null
       else sub.credits_total - sub.credits_used end as credits_left,
  (select count(*) from public.bookings b
    where b.student_id = st.profile_id and b.status = 'attended') as total_attended,
  (select count(*) from public.payments pay
    where pay.student_id = st.profile_id and pay.status = 'overdue') as overdue_payments
from public.students st
join public.profiles p on p.id = st.profile_id
left join lateral (
  select * from public.subscriptions s2
  where s2.student_id = st.profile_id
  order by (s2.status = 'active') desc, s2.starts_on desc
  limit 1
) sub on true
left join public.plans pl on pl.id = sub.plan_id;

-- =============================================================================
-- 12. RLS
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.user_roles      enable row level security;
alter table public.teachers        enable row level security;
alter table public.students        enable row level security;
alter table public.modalities      enable row level security;
alter table public.rooms           enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_sessions  enable row level security;
alter table public.plans           enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.credit_ledger   enable row level security;
alter table public.bookings        enable row level security;
alter table public.payments        enable row level security;
alter table public.teacher_payouts enable row level security;
alter table public.announcements   enable row level security;

-- ---------- profiles ----------
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());
create policy profiles_select_teacher on public.profiles
  for select using (public.is_teacher() and public.teaches_student(id));
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_all_admin on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- user_roles: leitura própria, escrita só admin ----------
create policy user_roles_select_self on public.user_roles
  for select using (user_id = auth.uid());
create policy user_roles_admin on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- teachers: catálogo público para autenticados ----------
create policy teachers_select_all on public.teachers
  for select to authenticated using (true);
create policy teachers_update_self on public.teachers
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy teachers_admin on public.teachers
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- students ----------
create policy students_select_self on public.students
  for select using (profile_id = auth.uid());
create policy students_select_teacher on public.students
  for select using (public.is_teacher() and public.teaches_student(profile_id));
create policy students_update_self on public.students
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy students_admin on public.students
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- catálogo: todos leem, admin escreve ----------
create policy modalities_read on public.modalities
  for select to authenticated using (true);
create policy modalities_admin on public.modalities
  for all using (public.is_admin()) with check (public.is_admin());

create policy rooms_read on public.rooms
  for select to authenticated using (true);
create policy rooms_admin on public.rooms
  for all using (public.is_admin()) with check (public.is_admin());

create policy plans_read on public.plans
  for select to authenticated using (is_active or public.is_admin());
create policy plans_admin on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- grade e sessões ----------
create policy schedules_read on public.class_schedules
  for select to authenticated using (true);
create policy schedules_admin on public.class_schedules
  for all using (public.is_admin()) with check (public.is_admin());

create policy sessions_read on public.class_sessions
  for select to authenticated using (true);
-- Professor edita só as próprias aulas (notas, status), não cria nem apaga.
create policy sessions_update_own_teacher on public.class_sessions
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy sessions_admin on public.class_sessions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- agendamentos ----------
create policy bookings_select_self on public.bookings
  for select using (student_id = auth.uid());
create policy bookings_select_teacher on public.bookings
  for select using (
    exists (select 1 from public.class_sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  );
create policy bookings_insert_self on public.bookings
  for insert with check (student_id = auth.uid());
-- Aluno só altera o próprio agendamento e apenas para cancelar.
create policy bookings_update_self on public.bookings
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid() and status = 'canceled');
-- Professor faz check-in dos alunos da sua aula.
create policy bookings_update_teacher on public.bookings
  for update using (
    exists (select 1 from public.class_sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.class_sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  );
create policy bookings_admin on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- financeiro: aluno lê o próprio, admin faz tudo ----------
create policy subscriptions_select_self on public.subscriptions
  for select using (student_id = auth.uid());
create policy subscriptions_admin on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create policy credit_ledger_select_self on public.credit_ledger
  for select using (
    exists (select 1 from public.subscriptions s
            where s.id = subscription_id and s.student_id = auth.uid())
  );
create policy credit_ledger_admin on public.credit_ledger
  for all using (public.is_admin()) with check (public.is_admin());

create policy payments_select_self on public.payments
  for select using (student_id = auth.uid());
create policy payments_admin on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

create policy payouts_select_self on public.teacher_payouts
  for select using (teacher_id = auth.uid());
create policy payouts_admin on public.teacher_payouts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- avisos ----------
create policy announcements_read on public.announcements
  for select to authenticated using (
    (published_at <= now())
    and (expires_at is null or expires_at > now())
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = any (audience)
    )
  );
create policy announcements_admin on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- 13. SEED — modalidades, salas e planos básicos
-- =============================================================================

-- Cores restritas à paleta ATMA. Todas passam 4,5:1 com letra marrom ou papel.
-- Verde profundo é derivado (mais escuro que #516D3B, logo mais contrastado).
insert into public.modalities (name, slug, description, color, default_duration_min) values
  ('Hatha Yoga',   'hatha',      'Posturas sustentadas, respiração e alinhamento.',    '#516D3B', 60),
  ('Vinyasa Flow', 'vinyasa',    'Sequências fluidas sincronizadas com a respiração.', '#BE8E55', 60),
  ('Yin Yoga',     'yin',        'Posturas longas e passivas, tecido conjuntivo.',     '#4E6E86', 75),
  ('Ashtanga',     'ashtanga',   'Série tradicional, prática vigorosa.',               '#3A2A20', 90),
  ('Meditação',    'meditacao',  'Práticas de atenção plena e respiração.',            '#DFC9A2', 45),
  ('Pranayama',    'pranayama',  'Técnicas respiratórias.',                            '#3E5430', 45)
on conflict (slug) do nothing;

insert into public.rooms (name, capacity) values
  ('Sala Principal', 20),
  ('Sala Shanti',    12)
on conflict (name) do nothing;

insert into public.plans (name, description, price, period, duration_days, class_credits, sort_order) values
  ('Aula Avulsa',      'Uma aula, sem fidelidade.',            60.00,  'single',  7,    1,    1),
  ('Pacote 10 aulas',  '10 aulas, validade de 90 dias.',      500.00,  'pack',    90,   10,   2),
  ('Mensal 2x semana', '8 aulas por mês.',                    260.00,  'monthly', 30,   8,    3),
  ('Mensal 3x semana', '12 aulas por mês.',                   340.00,  'monthly', 30,   12,   4),
  ('Mensal Ilimitado', 'Aulas ilimitadas no mês.',            420.00,  'monthly', 30,   null, 5)
on conflict (name) do nothing;
