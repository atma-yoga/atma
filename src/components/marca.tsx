import Image from "next/image";

/**
 * Regra 2 da marca: ela só existe em marrom sobre fundo claro, ou papel
 * sobre fundo escuro. O tema é escolha do visitante e só se conhece no
 * cliente, então cada peça renderiza os dois arquivos e o CSS mostra o
 * certo — ver `.marca-clara` / `.marca-escura` em globals.css.
 *
 * Passar `tom` fixa uma das versões (útil sobre um bloco que é sempre
 * marrom ou sempre papel, independente do tema).
 */
type Tom = "marrom" | "papel";

function ParDeImagens({
  arquivo,
  alt,
  largura,
  altura,
  tom,
  className,
}: {
  arquivo: "simbolo" | "logo_vertical";
  alt: string;
  largura: number;
  altura: number;
  tom?: Tom;
  className?: string;
}) {
  const props = {
    alt,
    width: largura,
    height: altura,
    priority: true,
  } as const;

  if (tom) {
    return (
      <Image
        src={`/brand/ATMA_${arquivo}_${tom}.svg`}
        className={className}
        {...props}
      />
    );
  }

  return (
    <>
      <Image
        src={`/brand/ATMA_${arquivo}_marrom.svg`}
        className={`marca-clara ${className ?? ""}`}
        {...props}
      />
      <Image
        src={`/brand/ATMA_${arquivo}_papel.svg`}
        className={`marca-escura ${className ?? ""}`}
        {...props}
        alt=""
        aria-hidden
      />
    </>
  );
}

/** Só a mandala. */
export function Simbolo({
  tamanho = 40,
  tom,
  className,
}: {
  tamanho?: number;
  tom?: Tom;
  className?: string;
}) {
  return (
    <ParDeImagens
      arquivo="simbolo"
      alt=""
      largura={tamanho}
      altura={tamanho}
      tom={tom}
      className={className}
    />
  );
}

/**
 * Assinatura completa. Não recompor — as proporções símbolo/texto são fixas
 * (regra 6), por isso usamos o arquivo pronto.
 */
export function Assinatura({
  largura = 160,
  tom,
  className,
}: {
  largura?: number;
  tom?: Tom;
  className?: string;
}) {
  return (
    <ParDeImagens
      arquivo="logo_vertical"
      alt="ATMA yoga estúdio"
      largura={largura}
      altura={Math.round(largura * 1.247)}
      tom={tom}
      className={className}
    />
  );
}

/**
 * Lockup horizontal para cabeçalho: mandala + nome em caixa alta espaçada.
 *
 * PROVISÓRIO — isto recompõe a assinatura, o que a regra 6 proíbe. Existe
 * só porque ainda não temos o arquivo horizontal. Assim que ele chegar,
 * trocar por <ParDeImagens arquivo="logo_horizontal" /> e apagar o texto.
 */
export function MarcaHorizontal({
  tom,
  className = "",
}: {
  tom?: Tom;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Simbolo tamanho={32} tom={tom} />
      <span className="flex flex-col leading-none">
        <span className="marca text-[15px]">ATMA</span>
        <span className="mt-[3px] text-[11px] tracking-[0.22em] uppercase text-[var(--color-subtle)]">
          yoga estúdio
        </span>
      </span>
    </span>
  );
}
