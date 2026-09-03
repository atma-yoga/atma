#!/usr/bin/env node
/**
 * Gera src/lib/database.types.ts a partir do schema real do banco.
 *
 * Existe porque `supabase gen types` exige login interativo. Os tipos vinham
 * sendo mantidos à mão e foram acumulando divergência — um Row com campo
 * marcado como opcional, uma coluna nova esquecida — e nada disso aparece no
 * typecheck: só quebra em produção, lendo um campo que não existe.
 *
 * Uso: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/gerar-tipos.mjs <project-ref>
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.argv[2];

if (!TOKEN || !REF) {
  console.error("uso: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/gerar-tipos.mjs <ref>");
  process.exit(1);
}

async function consultar(sql) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

/** Tipo do Postgres para tipo do TypeScript. */
function tipoTs(col, enums) {
  const t = col.data_type;
  const u = col.udt_name;

  if (t === "ARRAY") {
    const base = u.replace(/^_/, "");
    if (enums[base]) return `Database["public"]["Enums"]["${base}"][]`;
    return ["int4", "int8", "numeric", "float8"].includes(base)
      ? "number[]"
      : "string[]";
  }

  if (t === "USER-DEFINED" && enums[u]) {
    return `Database["public"]["Enums"]["${u}"]`;
  }

  switch (t) {
    case "boolean":
      return "boolean";
    case "smallint":
    case "integer":
    case "bigint":
    case "numeric":
    case "real":
    case "double precision":
      return "number";
    case "json":
    case "jsonb":
      return "Json";
    default:
      return "string";
  }
}

const enumsQuery = `
  select t.typname as nome,
         array_agg(e.enumlabel order by e.enumsortorder) as valores
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
  order by t.typname;
`;

const colunasQuery = `
  select c.table_name, c.column_name, c.data_type, c.udt_name,
         c.is_nullable, c.column_default,
         t.table_type
  from information_schema.columns c
  join information_schema.tables t
    on t.table_name = c.table_name and t.table_schema = c.table_schema
  where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position;
`;

const funcoesQuery = `
  select p.proname as nome,
         pg_get_function_arguments(p.oid) as args,
         pg_get_function_result(p.oid) as retorno
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname not like 'pg\\_%'
  order by p.proname;
`;

/**
 * Chaves estrangeiras. O supabase-js usa isto para inferir o tipo de um join
 * aninhado — sem Relationships, `teachers(profiles(full_name))` não compila.
 */
const fksQuery = `
  select
    tc.constraint_name as nome,
    tc.table_name      as tabela,
    kcu.column_name    as coluna,
    ccu.table_name     as tabela_alvo,
    ccu.column_name    as coluna_alvo,
    exists (
      select 1
      from pg_index i
      join pg_class t on t.oid = i.indrelid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = any(i.indkey)
      where t.relname = tc.table_name
        and a.attname = kcu.column_name
        and i.indisunique
        and array_length(i.indkey, 1) = 1
    ) as um_para_um
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
  order by tc.table_name, tc.constraint_name;
`;

const [enumRows, colRows, fnRows, fkRows] = await Promise.all([
  consultar(enumsQuery),
  consultar(colunasQuery),
  consultar(funcoesQuery),
  consultar(fksQuery),
]);

const fksPorTabela = {};
for (const fk of fkRows) {
  (fksPorTabela[fk.tabela] ??= []).push(fk);
}

function relacoes(tabela) {
  const fks = fksPorTabela[tabela] ?? [];
  if (!fks.length) return "[]";

  const itens = fks
    .map(
      (fk) => `          {
            foreignKeyName: "${fk.nome}";
            columns: ["${fk.coluna}"];
            isOneToOne: ${fk.um_para_um === true || fk.um_para_um === "true"};
            referencedRelation: "${fk.tabela_alvo}";
            referencedColumns: ["${fk.coluna_alvo}"];
          }`,
    )
    .join(",\n");

  return `[\n${itens},\n        ]`;
}

/** A API devolve array do Postgres como texto: "{a,b,c}". */
function listaPg(v) {
  if (Array.isArray(v)) return v;
  return String(v ?? "")
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((x) => x.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

const enums = Object.fromEntries(
  enumRows.map((e) => [e.nome, listaPg(e.valores)]),
);

// Funções que a aplicação chama e que não são gatilhos nem internas.
const CHAMAVEIS = new Set([
  "abrir_chamada",
  "consumir_convite",
  "expire_subscriptions",
  "fracao_do_mes",
  "generate_sessions",
  "gerar_mensalidades",
  "has_role",
  "is_admin",
  "is_student",
  "is_teacher",
  "teaches_student",
  "vencimento_da_mensalidade",
]);

const porTabela = {};
for (const c of colRows) {
  (porTabela[c.table_name] ??= { tipo: c.table_type, cols: [] }).cols.push(c);
}

const tabelas = Object.entries(porTabela).filter(
  ([, v]) => v.tipo === "BASE TABLE",
);
const views = Object.entries(porTabela).filter(([, v]) => v.tipo === "VIEW");

const linha = (nome, tipo, nulo, opcional) =>
  `          ${nome}${opcional ? "?" : ""}: ${tipo}${nulo ? " | null" : ""};`;

let out = `/**
 * GERADO AUTOMATICAMENTE — não edite à mão.
 *
 * Reflete o schema real do banco. Depois de aplicar uma migration, rode:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/gerar-tipos.mjs ${REF}
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
`;

for (const [nome, { cols }] of tabelas) {
  out += `      ${nome}: {\n        Row: {\n`;
  for (const c of cols) {
    out += linha(c.column_name, tipoTs(c, enums), c.is_nullable === "YES", false) + "\n";
  }
  out += `        };\n        Insert: {\n`;
  for (const c of cols) {
    const opcional = c.is_nullable === "YES" || c.column_default !== null;
    out += linha(c.column_name, tipoTs(c, enums), c.is_nullable === "YES", opcional) + "\n";
  }
  out += `        };\n        Update: {\n`;
  for (const c of cols) {
    out += linha(c.column_name, tipoTs(c, enums), c.is_nullable === "YES", true) + "\n";
  }
  out += `        };\n        Relationships: ${relacoes(nome)};\n      };\n\n`;
}

out += `    };\n    Views: {\n`;

for (const [nome, { cols }] of views) {
  out += `      ${nome}: {\n        Row: {\n`;
  for (const c of cols) {
    // Views agregadas quase sempre podem devolver nulo.
    out += linha(c.column_name, tipoTs(c, enums), true, false) + "\n";
  }
  out += `        };\n        Relationships: [];\n      };\n\n`;
}

out += `    };\n    Functions: {\n`;

for (const f of fnRows) {
  if (!CHAMAVEIS.has(f.nome)) continue;

  const args = (f.args || "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const partes = a.split(/\s+/);
      const nomeArg = partes[0];
      const tipoArg = partes.slice(1).join(" ");
      const temDefault = /default/i.test(a);
      const ts = /int|numeric|bigint|smallint/i.test(tipoArg) ? "number" : "string";
      return `${nomeArg}${temDefault ? "?" : ""}: ${ts}`;
    });

  const ret = /boolean/i.test(f.retorno)
    ? "boolean"
    : /int|numeric/i.test(f.retorno)
      ? "number"
      : /app_role/.test(f.retorno)
        ? 'Database["public"]["Enums"]["app_role"]'
        : "string";

  out += `      ${f.nome}: {\n        Args: ${
    args.length ? `{ ${args.join("; ")} }` : "Record<string, never>"
  };\n        Returns: ${ret};\n      };\n`;
}

out += `    };\n    Enums: {\n`;

for (const [nome, valores] of Object.entries(enums)) {
  out += `      ${nome}: ${valores.map((v) => `"${v}"`).join(" | ")};\n`;
}

out += `    };\n    CompositeTypes: Record<string, never>;\n  };\n};

/* --- atalhos --- */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
`;

process.stdout.write(out);
