"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoLocal = { erro: string } | { sucesso: string } | undefined;

const CORES = ["verde", "azul", "mel", "palha", "marrom", "verde-profundo"];

const CAMPOS_ENDERECO = [
  "cep",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
] as const;

function montarEndereco(form: FormData): Record<string, string> | null {
  const endereco: Record<string, string> = {};
  for (const campo of CAMPOS_ENDERECO) {
    const valor = String(form.get(campo) ?? "").trim();
    if (valor) endereco[campo] = campo === "uf" ? valor.toUpperCase() : valor;
  }
  return Object.keys(endereco).length ? endereco : null;
}

export async function salvarLocal(
  _anterior: EstadoLocal,
  form: FormData,
): Promise<EstadoLocal> {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) {
    return { erro: "Apenas a administração pode cadastrar locais." };
  }

  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  const capacidade = Number(form.get("capacidade") || 0);
  const aoArLivre = String(form.get("ar_livre") ?? "") === "1";
  const cor = String(form.get("cor") ?? "verde");
  const observacoes = String(form.get("observacoes") ?? "").trim();

  if (!nome) return { erro: "Dê um nome ao local." };
  if (capacidade < 1 || capacidade > 200) {
    return { erro: "Capacidade deve ficar entre 1 e 200." };
  }
  if (!CORES.includes(cor)) return { erro: "Cor fora da paleta." };

  const supabase = await createClient();

  const campos = {
    name: nome,
    capacity: capacidade,
    is_outdoor: aoArLivre,
    color: cor,
    address: montarEndereco(form),
    notes: observacoes || null,
  };

  const { error } = id
    ? await supabase.from("rooms").update(campos).eq("id", id)
    : await supabase.from("rooms").insert(campos);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { erro: "Já existe um local com esse nome." };
    }
    return { erro: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/admin/locais");
  revalidatePath("/admin/grade");
  revalidatePath("/admin");

  return { sucesso: id ? "Local atualizado." : `Local "${nome}" criado.` };
}

/**
 * Desativa em vez de apagar: as turmas e aulas passadas apontam para o local,
 * e removê-lo deixaria o histórico sem lugar.
 */
export async function alternarLocal(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) return;

  const id = String(form.get("id") ?? "");
  const ativar = String(form.get("ativar") ?? "") === "1";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("rooms").update({ is_active: ativar }).eq("id", id);

  revalidatePath("/admin/locais");
}
