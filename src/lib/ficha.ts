/**
 * Vocabulários da ficha de cadastro e as validações que os acompanham.
 *
 * Os `valor` são gravados no banco (profiles.health_conditions e
 * teachers.specialties). Mexer neles quebra o que já foi cadastrado — para
 * renomear um rótulo, mude só o `rotulo`.
 */

export const SENHA_PADRAO = "atma123";

export type Opcao = { valor: string; rotulo: string; nota?: string };

/** Condições que mudam o que se pode propor numa aula. */
export const CONDICOES_DE_SAUDE: Opcao[] = [
  { valor: "hipertensao", rotulo: "Hipertensão" },
  { valor: "diabetes", rotulo: "Diabetes" },
  { valor: "reumatismo", rotulo: "Reumatismo ou artrite" },
  { valor: "coluna", rotulo: "Problema de coluna" },
  { valor: "joelho", rotulo: "Lesão no joelho" },
  { valor: "ombro", rotulo: "Lesão no ombro" },
  { valor: "labirintite", rotulo: "Labirintite ou vertigem" },
  { valor: "cardiaco", rotulo: "Problema cardíaco" },
  { valor: "respiratorio", rotulo: "Asma ou respiratório" },
  { valor: "gravidez", rotulo: "Gestante" },
  { valor: "cirurgia_recente", rotulo: "Cirurgia recente" },
];

/** Técnicas em que um professor pode ter formação. */
export const TECNICAS: Opcao[] = [
  { valor: "hatha", rotulo: "Hatha" },
  { valor: "vinyasa", rotulo: "Vinyasa" },
  { valor: "ashtanga", rotulo: "Ashtanga" },
  { valor: "yin", rotulo: "Yin" },
  { valor: "iyengar", rotulo: "Iyengar" },
  { valor: "kundalini", rotulo: "Kundalini" },
  { valor: "restaurativa", rotulo: "Restaurativa" },
  { valor: "pranayama", rotulo: "Pranayama" },
  { valor: "meditacao", rotulo: "Meditação" },
];

const rotulos = (lista: Opcao[]) =>
  new Map(lista.map((o) => [o.valor, o.rotulo]));

const ROTULO_SAUDE = rotulos(CONDICOES_DE_SAUDE);
const ROTULO_TECNICA = rotulos(TECNICAS);

export const nomeDaCondicao = (v: string) => ROTULO_SAUDE.get(v) ?? v;
export const nomeDaTecnica = (v: string) => ROTULO_TECNICA.get(v) ?? v;

/* ===========================================================================
   CPF
   =========================================================================== */

export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function formatarCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Confere os dois dígitos verificadores.
 *
 * Vale a pena validar de verdade em vez de só contar 11 dígitos: o CPF é uma
 * das formas de login, então um dígito trocado na recepção vira uma pessoa
 * que não consegue entrar e ninguém entende por quê.
 */
export function cpfValido(entrada: string): boolean {
  const cpf = soDigitos(entrada);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // 111.111.111-11 e afins

  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(cpf[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/* ===========================================================================
   CEP
   =========================================================================== */

export const formatarCep = (v: string) => {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export type EnderecoDoCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/**
 * Consulta o ViaCEP. Devolve null em qualquer problema — CEP inexistente,
 * serviço fora do ar, sem internet — porque o cadastro precisa continuar
 * possível na mão quando a consulta falha.
 */
export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;

  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!r.ok) return null;

    const j = await r.json();
    if (j.erro) return null;

    return {
      logradouro: j.logradouro ?? "",
      bairro: j.bairro ?? "",
      cidade: j.localidade ?? "",
      uf: j.uf ?? "",
    };
  } catch {
    return null;
  }
}
