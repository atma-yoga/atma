import { redirect } from "next/navigation";

import {
  Composicao,
  FluxoDeCaixa,
  PresencaPorAluno,
  type MesDeCaixa,
} from "@/components/paineis/graficos-relatorio";
import { Shell } from "@/components/shell";
import { Numero, TituloSecao } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { nomeDoGenero } from "@/lib/ficha";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatórios" };

const FAIXAS = [
  "até 17",
  "18 a 24",
  "25 a 34",
  "35 a 44",
  "45 a 54",
  "55 a 64",
  "65 ou mais",
  "não informado",
];

export default async function RelatoriosPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();
  const ano = new Date().getFullYear();

  const [
    { data: caixa },
    { data: presenca },
    { data: bairros },
    { data: idades },
    { data: generos },
  ] = await Promise.all([
    supabase.from("v_relatorio_caixa").select("*").order("mes"),
    supabase.from("v_relatorio_presenca").select("*"),
    supabase.from("v_relatorio_bairros").select("*"),
    supabase.from("v_relatorio_idade").select("*"),
    supabase.from("v_relatorio_genero").select("*"),
  ]);

  const meses: MesDeCaixa[] = (caixa ?? [])
    .filter((m) => (m.mes ?? "").startsWith(String(ano)))
    .map((m) => ({
      mes: m.mes ?? "",
      previsto: Number(m.previsto ?? 0),
      recebido: Number(m.recebido ?? 0),
      emAberto: Number(m.em_aberto ?? 0),
    }));

  const recebidoNoAno = meses.reduce((s, m) => s + m.recebido, 0);
  const abertoNoAno = meses.reduce((s, m) => s + m.emAberto, 0);

  const listaPresenca = (presenca ?? []).map((p) => ({
    aluno: p.aluno ?? "sem nome",
    presencas: Number(p.presencas ?? 0),
    faltas: Number(p.faltas ?? 0),
    percentual: p.percentual === null ? null : Number(p.percentual),
  }));

  const comRegistro = listaPresenca.filter((a) => a.percentual !== null);
  const presencaMedia = comRegistro.length
    ? Math.round(
        comRegistro.reduce((s, a) => s + (a.percentual ?? 0), 0) /
          comRegistro.length,
      )
    : null;

  // A faixa etária tem ordem natural; as demais são ordenadas por tamanho
  // dentro do próprio componente.
  const faixas = FAIXAS.map((f) => ({
    rotulo: f,
    valor: Number((idades ?? []).find((i) => i.faixa === f)?.alunos ?? 0),
  })).filter((f) => f.valor > 0);

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Relatórios</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Como o estúdio anda em {ano}.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo={`Recebido em ${ano}`}
          valor={recebidoNoAno.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
        <Numero
          rotulo="Em aberto"
          valor={abertoNoAno.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
        <Numero
          rotulo="Presença média"
          valor={presencaMedia === null ? "—" : `${presencaMedia}%`}
          detalhe={
            comRegistro.length
              ? `${comRegistro.length} alunos com chamada`
              : undefined
          }
        />
        <Numero
          rotulo="Alunos ativos"
          valor={(generos ?? []).reduce((s, g) => s + Number(g.alunos ?? 0), 0)}
        />
      </div>

      <section className="mb-12">
        <TituloSecao>Dinheiro</TituloSecao>
        <FluxoDeCaixa meses={meses} />
      </section>

      <section className="mb-12">
        <TituloSecao>Presença</TituloSecao>
        <PresencaPorAluno alunos={listaPresenca} />
      </section>

      <section>
        <TituloSecao>Quem frequenta o estúdio</TituloSecao>

        <div className="grid gap-4 lg:grid-cols-3">
          <Composicao
            titulo="Bairro"
            fatias={(bairros ?? []).map((b) => ({
              rotulo: b.bairro ?? "não informado",
              valor: Number(b.alunos ?? 0),
            }))}
            vazio="Nenhum endereço cadastrado."
          />

          <Composicao
            titulo="Faixa etária"
            fatias={faixas}
            vazio="Nenhuma data de nascimento cadastrada."
          />

          <Composicao
            titulo="Gênero"
            fatias={(generos ?? []).map((g) => ({
              rotulo: nomeDoGenero(g.genero),
              valor: Number(g.alunos ?? 0),
            }))}
            vazio="Nada informado."
          />
        </div>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Estes três são contagens do grupo, sem nome de ninguém. Gênero é
          sempre opcional no cadastro.
        </p>
      </section>
    </Shell>
  );
}
