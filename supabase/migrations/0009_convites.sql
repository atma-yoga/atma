-- =============================================================================
-- 0009 — Convites por link
--
-- A administração gera um link e manda para a pessoa, que preenche o próprio
-- cadastro. O papel (aluno ou professor) vem do convite, não de quem
-- preenche: quem recebe um link de aluno não consegue virar professor
-- mexendo no formulário.
--
-- O cadastro público do Supabase continua desligado. A conta é criada pela
-- Server Action, com a chave secreta, e só depois de o convite ser validado.
-- =============================================================================

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  role        public.app_role not null,
  label       text,
  created_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null,
  max_uses    integer check (max_uses is null or max_uses > 0),
  uses        integer not null default 0 check (uses >= 0),
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  -- Um convite nunca dá admin: seria uma porta para se autopromover.
  check (role in ('student', 'teacher'))
);

comment on table public.invites is
  'Links de auto-cadastro. O papel vem daqui, nunca do formulário.';
comment on column public.invites.max_uses is
  'Quantas pessoas podem usar. NULL = sem limite até expirar.';
comment on column public.invites.token is
  'Segredo do link. Gerado aleatoriamente pela aplicação.';

create index if not exists invites_token on public.invites (token);

alter table public.invites enable row level security;

-- Ninguém além do admin lê a tabela. A validação do token na hora do
-- cadastro roda com a chave secreta, do lado do servidor — se um visitante
-- pudesse consultar, daria para descobrir convites válidos por tentativa.
drop policy if exists invites_admin on public.invites;
create policy invites_admin on public.invites
  for all using (public.is_admin()) with check (public.is_admin());

/**
 * Confere e consome um convite, numa operação só.
 *
 * Fazer as duas coisas juntas evita a corrida em que dois cadastros
 * simultâneos leem o mesmo convite de uso único e ambos passam.
 */
create or replace function public.consumir_convite(token_convite text)
returns public.app_role
language plpgsql
security definer
set search_path = public
as $$
declare
  convite public.invites%rowtype;
begin
  select * into convite
  from public.invites
  where token = token_convite
  for update;

  if not found then
    raise exception 'convite inválido' using errcode = 'no_data_found';
  end if;

  if convite.revoked_at is not null then
    raise exception 'convite cancelado' using errcode = 'no_data_found';
  end if;

  if convite.expires_at < now() then
    raise exception 'convite vencido' using errcode = 'no_data_found';
  end if;

  if convite.max_uses is not null and convite.uses >= convite.max_uses then
    raise exception 'convite já utilizado' using errcode = 'no_data_found';
  end if;

  update public.invites
  set uses = uses + 1
  where id = convite.id;

  return convite.role;
end;
$$;

-- Só a chave secreta chama isto; nenhum papel comum recebe permissão.
revoke all on function public.consumir_convite(text) from public, anon, authenticated;
