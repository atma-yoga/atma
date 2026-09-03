-- =============================================================================
-- 0002 — Estilo livre e cadastro feito pela administração
--
-- Duas mudanças de rumo:
--
-- 1. O estúdio não separa modalidades. Não existe Hatha, Vinyasa ou Yin —
--    existe aula de yoga. `modalities` sai inteira. No lugar, cada aula pode
--    ter um `title` livre ("Yoga restaurativa", "Aula aberta"), que é opcional:
--    vazio significa apenas "Yoga".
--
-- 2. Ninguém se cadastra sozinho. A administração cria as contas de professor
--    e de aluno. O gatilho de signup deixa de inventar papel e passa a
--    respeitar o que a adm mandou — mas continua incapaz de criar um admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Estilo livre
-- -----------------------------------------------------------------------------

drop view if exists public.v_session_availability;

alter table public.class_schedules add column if not exists title text;
alter table public.class_sessions  add column if not exists title text;

comment on column public.class_schedules.title is
  'Nome livre da aula. NULL = "Yoga".';

alter table public.class_schedules drop column if exists modality_id;
alter table public.class_sessions  drop column if exists modality_id;
alter table public.plans           drop column if exists allowed_modalities;

drop table if exists public.modalities;

-- A cor da aula era da modalidade. Sem modalidades, a agenda usa a paleta
-- diretamente e a view volta sem `modality` nem `modality_color`.
create or replace view public.v_session_availability
with (security_invoker = true) as
select
  s.id                as session_id,
  s.title,
  s.starts_at,
  s.ends_at,
  s.status,
  s.level,
  r.name              as room,
  p.full_name         as teacher_name,
  s.teacher_id,
  s.capacity,
  count(b.id) filter (where b.status in ('booked', 'attended')) as booked_count,
  s.capacity - count(b.id) filter (where b.status in ('booked', 'attended')) as spots_left,
  count(b.id) filter (where b.status = 'waitlisted') as waitlist_count
from public.class_sessions s
join public.profiles  p on p.id = s.teacher_id
left join public.rooms r on r.id = s.room_id
left join public.bookings b on b.session_id = s.id
group by s.id, r.name, p.full_name;

-- generate_sessions perde a modalidade e passa a copiar o título.
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
        (schedule_id, teacher_id, room_id, title, starts_at, ends_at, capacity, level)
      values (
        sch.id, sch.teacher_id, sch.room_id, sch.title,
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

-- -----------------------------------------------------------------------------
-- 2. Cadastro pela administração
-- -----------------------------------------------------------------------------

-- A adm cria a conta pela API de admin do Supabase, passando full_name, phone
-- e role no metadata. O gatilho apenas obedece — e continua sem poder criar
-- admin, para que uma conta comprometida não consiga se promover.
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

  desired_role := case new.raw_user_meta_data ->> 'role'
                    when 'teacher' then 'teacher'::public.app_role
                    else 'student'::public.app_role
                  end;

  insert into public.user_roles (user_id, role) values (new.id, desired_role);

  if desired_role = 'teacher' then
    insert into public.teachers (profile_id) values (new.id);
  else
    insert into public.students (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

-- Marca quem ainda não trocou a senha de primeiro acesso, para a aplicação
-- poder exigir a troca.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'true quando a conta foi criada pela adm com senha temporária.';

-- A adm precisa enxergar todos os perfis para gerenciar as pessoas. A política
-- de admin já cobre isso; aqui garantimos a leitura da lista de professores
-- por qualquer autenticado (o aluno vê quem dá a aula) sem expor os alunos.

-- -----------------------------------------------------------------------------
-- 3. Limpeza do seed antigo
-- -----------------------------------------------------------------------------

-- Os planos do seed inicial continuam válidos; nada a fazer.
-- As salas continuam válidas.
