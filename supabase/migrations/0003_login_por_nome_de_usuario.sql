-- =============================================================================
-- 0003 — Login por nome de usuário
--
-- O Supabase Auth sempre exige e-mail, mas ninguém no estúdio quer digitar
-- "crisnastari@gmail.com" na recepção. Cada perfil ganha um `username` curto,
-- e a tela de entrada aceita usuário OU e-mail.
--
-- A tradução usuário → e-mail acontece no servidor, na Server Action. Não
-- existe função pública para isso de propósito: se existisse, qualquer um
-- poderia descobrir o e-mail de qualquer aluno testando nomes.
-- =============================================================================

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Nome de acesso curto. Único, minúsculo, sem espaços. NULL = entra só por e-mail.';

-- Único, mas sem diferenciar maiúsculas: "CrisAtma" e "crisatma" são a mesma
-- pessoa. Índice parcial para não conflitar entre os vários NULL.
create unique index if not exists profiles_username_uniq
  on public.profiles (lower(username))
  where username is not null;

-- Formato: 3 a 30 caracteres, letras, números, ponto, hífen e underscore.
alter table public.profiles
  drop constraint if exists profiles_username_formato;
alter table public.profiles
  add constraint profiles_username_formato
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$');

-- O gatilho passa a gravar o username que a administração escolheu.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desired_role public.app_role;
begin
  insert into public.profiles (id, full_name, email, phone, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    nullif(lower(new.raw_user_meta_data ->> 'username'), '')
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
