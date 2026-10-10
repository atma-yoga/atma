import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ATMA yoga estúdio",
    template: "%s · ATMA",
  },
  description: "Gestão do estúdio: agenda, turmas, planos e alunos.",
  icons: { icon: "/brand/ATMA_simbolo_marrom.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#2B1F18" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          Aplica o tema escolhido antes da página pintar. Em componente React
          isso só rodaria depois do primeiro quadro, e quem escolheu o claro
          veria um lampejo marrom a cada troca de página.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tema');" +
              "if(t==='claro'){document.documentElement.dataset.theme='light'}" +
              "else if(t==='escuro'){document.documentElement.dataset.theme='dark'}}" +
              "catch(e){}",
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
