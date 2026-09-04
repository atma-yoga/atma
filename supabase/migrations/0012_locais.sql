-- =============================================================================
-- 0012 — Locais
--
-- O local da aula deixa de ser uma linha fixa da migration e vira cadastro:
-- nome, endereço, se é interno ou ao ar livre, e uma cor para a agenda.
--
-- A cor é guardada como nome da paleta, não como hexadecimal. Assim ninguém
-- consegue cadastrar um roxo que destoe da marca, e se um tom da paleta for
-- ajustado um dia, os locais acompanham sozinhos.
-- =============================================================================

alter table public.rooms
  add column if not exists address jsonb,
  add column if not exists color text;

comment on column public.rooms.address is
  'Endereço: { cep, logradouro, numero, complemento, bairro, cidade, uf }.';
comment on column public.rooms.color is
  'Cor da paleta ATMA usada na agenda. Vocabulário em src/lib/ficha.ts.';

-- Só cores da paleta. Palha e mel entram porque aqui são fundo de filete,
-- não cor de letra — a regra da marca continua valendo para texto.
alter table public.rooms drop constraint if exists rooms_color_paleta;
alter table public.rooms
  add constraint rooms_color_paleta
  check (
    color is null
    or color in ('verde', 'azul', 'mel', 'palha', 'marrom', 'verde-profundo')
  );

-- Mantém o que a agenda já mostrava: interno em verde, ar livre em azul.
update public.rooms
set color = case when is_outdoor then 'azul' else 'verde' end
where color is null;

-- O endereço do Iate Clube já era conhecido; o do estúdio a administração
-- preenche na tela.
update public.rooms
set address = jsonb_build_object(
  'bairro', 'Praia dos Ossos',
  'cidade', 'Armação dos Búzios',
  'uf', 'RJ'
)
where name = 'Iate Clube' and address is null;

-- -----------------------------------------------------------------------------
-- A view da grade passa a devolver a cor do local
-- -----------------------------------------------------------------------------

-- Recriada do zero: `create or replace` não aceita inserir coluna no meio
-- da lista, e `cor` entra antes de teacher_id.
drop view if exists public.v_grade_semanal;

create view public.v_grade_semanal
with (security_invoker = true) as
select
  cm.id            as meeting_id,
  c.id             as class_id,
  c.name           as turma,
  cm.weekday,
  cm.start_time,
  cm.duration_min,
  c.capacity,
  c.is_active,
  r.name           as sala,
  r.is_outdoor,
  r.color          as cor,
  c.teacher_id,
  p.full_name      as professor,
  coalesce(p.social_name, p.full_name) as professor_chamado,
  (select count(*) from public.class_enrollments e
    where e.class_id = c.id and e.is_active) as matriculados
from public.class_meetings cm
join public.classes c on c.id = cm.class_id
left join public.rooms r on r.id = c.room_id
left join public.profiles p on p.id = c.teacher_id;
