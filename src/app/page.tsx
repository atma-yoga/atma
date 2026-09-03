import { redirect } from "next/navigation";

import { getSessao } from "@/lib/auth";
import { rotaInicial } from "@/lib/tipos";

/** A home só distribui: cada papel tem seu painel. */
export default async function Home() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  redirect(rotaInicial(sessao.papeis));
}
