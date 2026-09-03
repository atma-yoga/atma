# ATMA yoga estúdio — sistema de gestão

Agenda, turmas, planos, alunos e financeiro do estúdio, com três olhares:
administração, professor e aluno.

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS)

## Começar

```bash
npm install
cp .env.example .env.local   # preencher com as chaves do Supabase
npm run dev
```

`SUPABASE_SECRET_KEY` é obrigatória para a administração cadastrar pessoas —
sem ela a tela de Pessoas mostra erro. Ela ignora RLS por completo: só no
servidor, nunca no cliente, nunca no git.

## Banco

O schema inteiro vive em [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
Aplicar pelo SQL Editor do painel Supabase, ou:

```bash
supabase link --project-ref <ref> && supabase db push
```

### O primeiro admin

Só um admin cadastra pessoas, mas no banco vazio não existe admin — ovo e
galinha. A saída é autorizar o e-mail **antes** da conta existir:

```sql
insert into public.pending_admins (email, username)
values ('SEU@EMAIL', 'seuusuario');
```

Depois crie a conta normalmente (Supabase → Authentication → Users → Add user,
com *Auto Confirm*). O gatilho vê o e-mail pré-autorizado, concede admin e
consome a linha — uso único.

Isso não afrouxa a regra de que ninguém se promove sozinho: escrever em
`pending_admins` exige já ser admin ou usar a chave secreta.

E materializar a grade em sessões concretas:

```sql
select generate_sessions(current_date, current_date + 60);
```

### Estrutura

| Área | Tabelas |
|---|---|
| Identidade | `profiles`, `user_roles`, `teachers`, `students` |
| Catálogo | `rooms` (com `is_outdoor`), `plans` |
| Agenda | `class_schedules` (grade recorrente) → `class_sessions` (ocorrência) |
| Aulas | `bookings` com lista de espera automática |
| Financeiro | `subscriptions`, `credit_ledger`, `payments`, `teacher_payouts` |
| Comunicação | `announcements` |

`class_schedules` é o template ("terça, 19h"); `class_sessions` é a aula
concreta numa data, e é o que o aluno agenda. `generate_sessions()` materializa
uma da outra.

O estúdio pratica **estilo livre**: não há Hatha, Vinyasa ou Yin. Uma aula sem
`title` é simplesmente "Yoga"; o título existe só para as exceções ("Yoga
restaurativa").

Aula tem lugar, e nem todo lugar é sala: parte das aulas de 08:30 acontece ao
ar livre, no Iate Clube da Praia dos Ossos. Daí `rooms.is_outdoor` — a agenda
marca sala fechada em verde e ar livre em azul.

A grade atual (segunda a sexta, aulas de 1 hora) está na migration `0006` e é
editável em **Agenda**, no painel da administração.

Regras que vivem no banco, não na aplicação:

- Ninguém se cadastra sozinho: a administração cria as contas de professor e
  de aluno, com senha temporária. O gatilho de signup obedece ao papel que a
  adm mandou, mas é incapaz de criar um admin — promoção a admin só por SQL.
- Turma cheia manda o agendamento para lista de espera, com posição.
- Crédito é debitado ao agendar e estornado ao cancelar — falta não estorna.
- Duas aulas não ocupam a mesma sala no mesmo horário (constraint de exclusão).

### Permissões

RLS em todas as tabelas. Resumo:

| | Admin | Professor | Aluno |
|---|---|---|---|
| Perfis | tudo | alunos que já agendaram com ele | o próprio |
| Grade e sessões | CRUD | edita as próprias aulas | leitura |
| Agendamentos | tudo | vê os da sua aula, faz check-in | cria o próprio, só pode cancelar |
| Financeiro | tudo | o próprio repasse | as próprias cobranças |

O cadastro público não consegue se atribuir `admin`: `handle_new_user()` força
`student` (ou `teacher`, quando vem no metadata). Promoção é manual.

### Tipos

[`src/lib/database.types.ts`](src/lib/database.types.ts) é escrito à mão e
espelha a migration. Ao mexer em uma, mexer na outra — ou regerar:

```bash
supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
```

## Marca

Arquivos e regras em [`public/brand/`](public/brand/). A paleta está codificada
como tokens em [`src/app/globals.css`](src/app/globals.css). O que não pode
mudar:

1. **Só duas cores de letra: marrom (`#3A2A20`) e papel (`#F5F1E8`).** Palha e
   mel são fundo, nunca texto.
2. Mínimo de 4,5:1 para texto corrido.
3. Verde sobre palha dá 3,6:1 — parece que funciona e não funciona.
4. Não recompor a assinatura; as proporções símbolo/texto são fixas.

O modo escuro usa marrom como fundo e papel como letra, seguindo a regra da
marca — não inverte para preto.

## Pendências

- Arquivos da marca em versão horizontal e nas variantes coloridas (azul,
  verde, palha, mel). Hoje só existem símbolo e vertical, em marrom e papel.
- Definir se as variantes coloridas entram no sistema — o guia atual diz que a
  marca só existe em marrom e papel, o que conflita com os arquivos coloridos.
- Troca obrigatória da senha no primeiro acesso: a coluna
  `profiles.must_change_password` já é gravada, mas nada ainda a exige.
- Telas de turmas, plano e financeiro.
