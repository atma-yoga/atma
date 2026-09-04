#!/usr/bin/env node
/**
 * Popula o banco com pessoas e histórico fictícios, para dar o que olhar
 * enquanto o estúdio ainda não tem gente de verdade.
 *
 *   node scripts/dados-demo.mjs criar
 *   node scripts/dados-demo.mjs limpar
 *
 * Tudo que este script cria usa e-mails @demo.atma, e `limpar` remove
 * exatamente isso — nada de dado real é tocado.
 *
 * As contas nascem com senha aleatória de 32 caracteres que ninguém anota.
 * São para ver telas cheias, não para entrar: uma conta de demonstração com
 * senha conhecida é uma porta aberta se este banco virar produção.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// Lê .env.local sem depender de pacote extra.
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DOMINIO = "demo.atma";
const senhaImpossivel = () => randomUUID() + randomUUID();

const PROFESSORES = [
  { nome: "Marina Vieira", social: "Marina", tecnicas: ["hatha", "vinyasa", "restaurativa"] },
  { nome: "Rafael Nunes", social: "Rafa", tecnicas: ["ashtanga", "pranayama"] },
  { nome: "Cláudia Bastos", social: null, tecnicas: ["yin", "meditacao", "restaurativa"] },
];

const ALUNOS = [
  { nome: "Helena Costa Ribeiro", social: "Helena", saude: ["coluna"], obs: "Hérnia lombar — evitar flexão profunda." },
  { nome: "Bruno Almeida Salles", social: null, saude: [], obs: null },
  { nome: "Carla Ribeiro Tavares", social: "Carlinha", saude: ["hipertensao"], obs: "Evitar inversões longas." },
  { nome: "Diego Farias Monteiro", social: null, saude: ["joelho"], obs: "Cirurgia de menisco em 2024." },
  { nome: "Elisa Monteiro Braga", social: "Lisa", saude: ["gravidez"], obs: "Gestante, 22 semanas." },
  { nome: "Fernando Guedes Pinto", social: null, saude: [], obs: null },
  { nome: "Gabriela Souza Lima", social: "Gabi", saude: ["labirintite"], obs: null },
  { nome: "Henrique Duarte Rocha", social: null, saude: ["diabetes"], obs: null },
  { nome: "Isabel Prado Carvalho", social: "Bel", saude: ["reumatismo", "ombro"], obs: "Dor no manguito rotador à direita." },
  { nome: "João Vitor Menezes", social: "JV", saude: [], obs: null },
  { nome: "Karina Lopes Ferreira", social: null, saude: ["respiratorio"], obs: "Asma leve." },
  { nome: "Lucas Andrade Peixoto", social: null, saude: [], obs: null },
  { nome: "Mariana Teixeira Alves", social: "Mari", saude: ["coluna"], obs: null },
  { nome: "Nuno Cardoso Barros", social: null, saude: [], obs: null },
  { nome: "Olívia Sampaio Reis", social: "Lívia", saude: [], obs: null },
];

/** CPF válido gerado a partir de uma base — os dígitos batem. */
function cpfDe(base9) {
  const d = String(base9).padStart(9, "0").slice(0, 9).split("").map(Number);
  const digito = (arr) => {
    const peso = arr.length + 1;
    const soma = arr.reduce((s, n, i) => s + n * (peso - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = digito(d);
  const d2 = digito([...d, d1]);
  return d.join("") + d1 + d2;
}

const email = (nome, i) =>
  `${nome.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${i}@${DOMINIO}`;

const telefone = (i) =>
  `(22) 9${String(9000 + i).padStart(4, "0")}-${String(1000 + i * 7).slice(0, 4)}`;

async function criarPessoa({ nome, social, papel, indice, cpf }) {
  const { data, error } = await db.auth.admin.createUser({
    email: email(nome, indice),
    password: senhaImpossivel(),
    email_confirm: true,
    user_metadata: {
      full_name: nome,
      social_name: social,
      phone: telefone(indice),
      document_id: cpf,
      role: papel,
    },
  });

  if (error) throw new Error(`${nome}: ${error.message}`);
  return data.user.id;
}

async function criar() {
  console.log("Criando professores…");
  const professores = [];
  for (const [i, p] of PROFESSORES.entries()) {
    const id = await criarPessoa({ ...p, papel: "teacher", indice: i + 1, cpf: cpfDe(100000000 + i) });
    await db.from("teachers").update({ specialties: p.tecnicas, hired_at: "2024-03-01" }).eq("profile_id", id);
    professores.push({ id, nome: p.social ?? p.nome });
    console.log(`  ${p.nome}`);
  }

  console.log("Criando alunos…");
  const alunos = [];
  for (const [i, a] of ALUNOS.entries()) {
    const id = await criarPessoa({ ...a, papel: "student", indice: i + 20, cpf: cpfDe(200000000 + i) });
    await db
      .from("profiles")
      .update({
        health_conditions: a.saude,
        health_notes: a.obs,
        address: { cidade: "Armação dos Búzios", uf: "RJ", bairro: "Centro" },
        must_change_password: true,
      })
      .eq("id", id);
    alunos.push({ id, nome: a.social ?? a.nome });
    console.log(`  ${a.nome}`);
  }

  // --- professores e preço nas turmas ---
  const { data: turmas } = await db.from("classes").select("id, name").order("name");
  console.log(`\nDistribuindo ${alunos.length} alunos em ${turmas.length} turmas…`);

  const PRECOS = [220, 220, 260, 180, 220];

  for (const [i, t] of turmas.entries()) {
    await db
      .from("classes")
      .update({
        teacher_id: professores[i % professores.length].id,
        monthly_price: PRECOS[i % PRECOS.length],
      })
      .eq("id", t.id);
  }

  // --- matrículas: espalhadas, com algumas turmas mais cheias ---
  const quantos = [8, 5, 11, 4, 7];
  let cursor = 0;
  for (const [i, t] of turmas.entries()) {
    const n = quantos[i % quantos.length];
    for (let k = 0; k < n; k++) {
      const aluno = alunos[(cursor + k) % alunos.length];
      // Entradas espalhadas ao longo do ano, para a proporção variar.
      const meses = [0, 0, 0, 2, 4, 6, 7, 8];
      const mes = meses[(cursor + k) % meses.length];
      const dia = [3, 9, 14, 18, 22, 27][(cursor + k) % 6];
      const entrada = new Date(2026, mes, dia, 10);

      await db.from("class_enrollments").insert({
        class_id: t.id,
        student_id: aluno.id,
        enrolled_at: entrada.toISOString(),
      });
    }
    cursor += 3;
    console.log(`  ${t.name}: ${n} alunos`);
  }

  // --- aulas dos últimos 90 dias, com chamada feita ---
  console.log("\nGerando aulas e chamadas…");
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 90 * 864e5);

  const { data: encontros } = await db
    .from("class_meetings")
    .select("class_id, weekday, start_time, duration_min, classes(teacher_id, room_id, capacity, name)");

  let aulas = 0;
  let presencas = 0;

  for (let d = new Date(inicio); d <= hoje; d.setDate(d.getDate() + 1)) {
    const dia = new Date(d);
    for (const m of encontros ?? []) {
      if (dia.getDay() !== m.weekday) continue;

      const iso = dia.toISOString().slice(0, 10);
      const comeco = new Date(`${iso}T${m.start_time}-03:00`);

      const { data: sessao } = await db
        .from("class_sessions")
        .insert({
          class_id: m.class_id,
          teacher_id: m.classes.teacher_id,
          room_id: m.classes.room_id,
          title: m.classes.name,
          starts_at: comeco.toISOString(),
          ends_at: new Date(comeco.getTime() + m.duration_min * 60000).toISOString(),
          capacity: m.classes.capacity,
          status: "completed",
        })
        .select("id")
        .single();

      if (!sessao) continue;
      aulas++;

      const { data: matriculados } = await db
        .from("class_enrollments")
        .select("student_id, enrolled_at")
        .eq("class_id", m.class_id)
        .eq("is_active", true);

      for (const e of matriculados ?? []) {
        if (new Date(e.enrolled_at) > comeco) continue; // ainda não era da turma

        // ~82% de presença, variando por pessoa para os gráficos não ficarem iguais.
        const semente = (e.student_id.charCodeAt(0) + dia.getDate()) % 100;
        const veio = semente > 18;

        await db.from("bookings").insert({
          session_id: sessao.id,
          student_id: e.student_id,
          status: veio ? "attended" : "no_show",
          checked_in_at: veio ? comeco.toISOString() : null,
        });

        if (veio) presencas++;
      }
    }
  }

  console.log(`  ${aulas} aulas, ${presencas} presenças`);

  // --- aulas futuras, sem chamada ---
  const fim = new Date(hoje.getTime() + 21 * 864e5);
  const { error: erroFuturas } = await db.rpc("generate_sessions", {
    range_start: hoje.toISOString().slice(0, 10),
    range_end: fim.toISOString().slice(0, 10),
  });
  if (erroFuturas) console.log(`  (aulas futuras: ${erroFuturas.message})`);

  console.log("\nPronto. Use `node scripts/dados-demo.mjs limpar` para remover.");
}

async function limpar() {
  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 1000 });
  const demo = (usuarios?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMINIO}`));

  console.log(`Removendo ${demo.length} contas de demonstração…`);
  for (const u of demo) {
    await db.auth.admin.deleteUser(u.id);
  }

  // As aulas e cobranças caem junto por cascade; o que sobra é o que ficou
  // sem dono — sessões de turmas que continuaram existindo.
  await db.from("class_sessions").delete().lt("starts_at", new Date().toISOString());

  console.log("Removido. As turmas e locais continuam.");
}

const comando = process.argv[2];
if (comando === "criar") await criar();
else if (comando === "limpar") await limpar();
else {
  console.error("uso: node scripts/dados-demo.mjs criar|limpar");
  process.exit(1);
}
