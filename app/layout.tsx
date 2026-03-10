import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalkTube | Interpretação Simultânea Humana de Alta Performance",
  description: "Elimine barreiras de idioma com máxima eficiência. Conecte-se a intérpretes profissionais em tempo real com qualidade de estúdio e latência zero.",
  icons: {
    icon: "/logos/talktube_favicon.png",
  },
};

import { WebRTCPolyfills } from '@/components/webrtc-polyfills'
import { ToastProvider } from '@/components/providers/toast-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { PageTransition } from '@/components/providers/page-transition'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WebRTCPolyfills />
        <ToastProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <PageTransition>
              {children}
            </PageTransition>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
