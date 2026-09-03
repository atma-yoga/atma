-- =============================================================================
-- 0007 — Ficha de cadastro completa
--
-- O cadastro deixa de ser um esboço e vira a ficha que o estúdio realmente
-- preenche na recepção:
--
--   · nome social, separado do nome de usuário (são coisas diferentes: o nome
--     social é como a pessoa quer ser chamada e aceita espaço e acento; o
--     nome de usuário é um apelido técnico sem espaços)
--   · CPF, que também serve de login para o aluno
--   · ficha de saúde com condições marcáveis, além das observações livres
--   · técnicas do professor, marcáveis
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Nome social
-- -----------------------------------------------------------------------------

alter table public.profiles add column if not exists social_name text;

comment on column public.profiles.social_name is
  'Como a pessoa quer ser chamada. Usado nas saudações e listas quando existe. '
  'Não confundir com username, que é apelido de acesso.';

comment on column public.profiles.phone is 'Telefone com WhatsApp.';

-- -----------------------------------------------------------------------------
-- CPF — documento e segunda forma de login do aluno
-- -----------------------------------------------------------------------------

comment on column public.profiles.document_id is
  'CPF, gravado só com dígitos. Serve de login alternativo ao e-mail.';

-- Guardado sem pontuação para a busca de login não depender de formatação.
update public.profiles
set document_id = regexp_replace(document_id, '\D', '', 'g')
where document_id is not null;

alter table public.profiles drop constraint if exists profiles_document_id_formato;
alter table public.profiles
  add constraint profiles_document_id_formato
  check (document_id is null or document_id ~ '^\d{11}$');

create unique index if not exists profiles_document_id_uniq
  on public.profiles (document_id)
  where document_id is not null;

-- -----------------------------------------------------------------------------
-- Ficha de saúde
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists health_conditions text[] not null default '{}';

comment on column public.profiles.health_conditions is
  'Condições marcadas na ficha. Vocabulário em src/lib/ficha.ts. '
  'Dado sensível (LGPD), como health_notes.';

-- -----------------------------------------------------------------------------
-- Técnicas do professor
--
-- O estúdio dá aula de estilo livre, mas o professor tem formação em
-- técnicas específicas. Por isso isto vive em `teachers`, não na aula.
-- A coluna `specialties` já existia sem uso; ganha significado agora.
-- -----------------------------------------------------------------------------

comment on column public.teachers.specialties is
  'Técnicas que o professor domina. Vocabulário em src/lib/ficha.ts.';

-- -----------------------------------------------------------------------------
-- O gatilho passa a gravar os campos novos
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desired_role public.app_role;
  pendente     public.pending_admins%rowtype;
  nome_usuario text;
begin
  nome_usuario := nullif(lower(new.raw_user_meta_data ->> 'username'), '');

  select * into pendente
  from public.pending_admins
  where lower(email) = lower(new.email);

  if found then
    desired_role := 'admin';
    nome_usuario := coalesce(nome_usuario, nullif(lower(pendente.username), ''));
    delete from public.pending_admins where lower(email) = lower(new.email);
  else
    desired_role := case new.raw_user_meta_data ->> 'role'
                      when 'teacher' then 'teacher'::public.app_role
                      else 'student'::public.app_role
                    end;
  end if;

  insert into public.profiles (
    id, full_name, social_name, email, phone, username, document_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'social_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    nome_usuario,
    nullif(regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'document_id', ''), '\D', '', 'g'
    ), '')
  );

  insert into public.user_roles (user_id, role) values (new.id, desired_role);

  if desired_role = 'teacher' then
    insert into public.teachers (profile_id) values (new.id);
  elsif desired_role = 'student' then
    insert into public.students (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
