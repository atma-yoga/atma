-- =============================================================================
-- 0004 — Admin pré-autorizado
--
-- O primeiro admin é um problema de ovo e galinha: só um admin cadastra
-- pessoas, mas não existe admin ainda. A saída usual é rodar SQL na mão
-- depois de criar a conta, o que é fácil de esquecer e deixa a conta como
-- aluno no meio do caminho.
--
-- Aqui a autorização vem antes da conta: um e-mail entra em
-- `pending_admins`, e quando alguém se cadastra com ele, o gatilho concede
-- admin e consome a linha. Uso único.
--
-- Isto NÃO afrouxa a regra de que ninguém se promove sozinho: preencher
-- `pending_admins` exige ser admin ou usar a chave secreta. Quem se cadastra
-- pela porta da frente continua virando aluno.
-- =============================================================================

create table if not exists public.pending_admins (
  email      text primary key,
  username   text,
  created_at timestamptz not null default now(),
  note       text
);

comment on table public.pending_admins is
  'E-mails autorizados a virar admin no momento do cadastro. Consumido na criação da conta.';

alter table public.pending_admins enable row level security;

-- Nenhuma política para usuários comuns: só admin enxerga, e a chave secreta
-- (que ignora RLS) escreve. Um visitante anônimo não consegue nem ler para
-- descobrir quais e-mails estão pré-autorizados.
drop policy if exists pending_admins_admin on public.pending_admins;
create policy pending_admins_admin on public.pending_admins
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desired_role public.app_role;
  pendente     public.pending_admins%rowtype;
  nome_usuario text;
begin
  nome_usuario := nullif(lower(new.raw_user_meta_data ->> 'username'), '');

  -- Pré-autorização vence o metadata: se o e-mail foi liberado por alguém que
  -- já era admin, a conta nasce admin.
  select * into pendente
  from public.pending_admins
  where lower(email) = lower(new.email);

  if found then
    desired_role := 'admin';
    nome_usuario := coalesce(nome_usuario, nullif(lower(pendente.username), ''));
    delete from public.pending_admins where lower(email) = lower(new.email);
  else
    -- Sem pré-autorização, o metadata só escolhe entre professor e aluno.
    -- 'admin' aqui é ignorado de propósito.
    desired_role := case new.raw_user_meta_data ->> 'role'
                      when 'teacher' then 'teacher'::public.app_role
                      else 'student'::public.app_role
                    end;
  end if;

  insert into public.profiles (id, full_name, email, phone, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    nome_usuario
  );

  insert into public.user_roles (user_id, role) values (new.id, desired_role);

  -- Admin não é aluno nem professor: não ganha linha em nenhuma das duas.
  if desired_role = 'teacher' then
    insert into public.teachers (profile_id) values (new.id);
  elsif desired_role = 'student' then
    insert into public.students (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
