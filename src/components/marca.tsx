import Image from "next/image";

type Tom = "marrom" | "papel";

/** Só a mandala. */
export function Simbolo({
  tamanho = 40,
  tom = "marrom",
  className,
}: {
  tamanho?: number;
  tom?: Tom;
  className?: string;
}) {
  return (
    <Image
      src={`/brand/ATMA_simbolo_${tom}.svg`}
      alt=""
      width={tamanho}
      height={tamanho}
      className={className}
      priority
    />
  );
}

/**
 * Assinatura completa. Não recompor — as proporções símbolo/texto são fixas
 * (regra 6 da marca), por isso usamos o arquivo pronto.
 */
export function Assinatura({
  largura = 160,
  tom = "marrom",
  className,
}: {
  largura?: number;
  tom?: Tom;
  className?: string;
}) {
  return (
    <Image
      src={`/brand/ATMA_logo_vertical_${tom}.svg`}
      alt="ATMA yoga estúdio"
      width={largura}
      height={Math.round(largura * 1.247)}
      className={className}
      priority
    />
  );
}

/** Lockup horizontal para cabeçalho: mandala + nome em caixa alta espaçada. */
export function MarcaHorizontal({
  tom = "marrom",
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
        <span className="mt-[3px] text-[9px] tracking-[0.22em] uppercase text-[var(--color-subtle)]">
          yoga estúdio
        </span>
      </span>
    </span>
  );
}
