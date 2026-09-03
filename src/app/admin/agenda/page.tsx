import { redirect } from "next/navigation";

import {
  GradeDeHorarios,
  type HorarioDaGrade,
} from "@/components/paineis/grade-de-horarios";
import { Shell } from "@/components/shell";
import { Botao, Cartao } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { desativarHorario, gerarAulas, salvarHorario } from "./actions";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const [{ data: grade }, { data: salas }, { data: professores }] =
    await Promise.all([
      supabase
        .from("class_schedules")
        .select(
          "id, weekday, start_time, duration_min, capacity, title, is_active, room_id, teacher_id, rooms(name, is_outdoor), teachers(profiles(full_name))",
        )
        .order("weekday")
        .order("start_time"),

      supabase
        .from("rooms")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("teachers")
        .select("profile_id, profiles(full_name)")
        .eq("is_active", true),
    ]);

  const horarios: HorarioDaGrade[] = (grade ?? []).map((h) => ({
    id: h.id,
    weekday: h.weekday,
    hora: String(h.start_time).slice(0, 5),
    duracao: h.duration_min,
    capacidade: h.capacity,
    salaId: h.room_id,
    sala: h.rooms?.name ?? null,
    aoArLivre: h.rooms?.is_outdoor ?? false,
    professorId: h.teacher_id ?? null,
    professor: h.teachers?.profiles?.full_name ?? null,
    titulo: h.title ?? null,
    ativo: h.is_active,
  }));

  const semProfessor = horarios.filter((h) => h.ativo && !h.professorId).length;

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">Grade de horários</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            O que se repete toda semana. Aulas concretas saem daqui.
          </p>
        </div>

        <form action={gerarAulas} className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Gerar aulas por
            </span>
            <select
              name="dias"
              defaultValue="30"
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>
          <Botao type="submit" variante="secundario">
            Gerar
          </Botao>
        </form>
      </div>

      {semProfessor > 0 ? (
        <Cartao className="mb-8 border-l-3 border-l-[var(--color-mel)] px-5 py-4">
          <p className="text-sm">
            {semProfessor}{" "}
            {semProfessor === 1 ? "horário está" : "horários estão"} sem
            professor definido.
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            A aula é gerada mesmo assim, mas o aluno não vê quem dá. Cadastre os
            professores em Pessoas e escolha aqui.
          </p>
        </Cartao>
      ) : null}

      <GradeDeHorarios
        horarios={horarios}
        salas={(salas ?? []).map((s) => ({ id: s.id, nome: s.name }))}
        professores={(professores ?? []).map((p) => ({
          id: p.profile_id,
          nome: p.profiles?.full_name || "sem nome",
        }))}
        salvar={salvarHorario}
        desativar={desativarHorario}
      />
    </Shell>
  );
}
