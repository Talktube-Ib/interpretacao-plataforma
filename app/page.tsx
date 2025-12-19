'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Globe, Mic, Users, Zap, Shield, Sparkles, MonitorSmartphone } from "lucide-react"
import { motion } from "framer-motion"
import { ModeToggle } from "@/components/mode-toggle"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#06b6d4]/30 transition-colors duration-500">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#06b6d4]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-indigo-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Modern Navbar */}
        <nav className="border-b border-border bg-card/20 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-6 h-20 flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-[#06b6d4] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#06b6d4]/20">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter italic text-foreground">
                Interpreta<span className="text-[#06b6d4]">.ai</span>
              </span>
            </motion.div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
              <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
              <a href="#about" className="hover:text-foreground transition-colors">Sobre</a>
              <ModeToggle />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent/50" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button className="bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold rounded-xl px-6 shadow-lg shadow-[#06b6d4]/20" asChild>
                <Link href="/signup">Grátis</Link>
              </Button>
            </motion.div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto text-center max-w-5xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/50 border border-border text-[#06b6d4] text-[10px] font-bold uppercase tracking-widest mb-8"
            >
              <Sparkles className="h-3.5 w-3.5" />
              A Nova Era da Interpretação Remota
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-foreground"
            >
              Conecte o Mundo <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] via-indigo-500 to-purple-600">
                Sem Barreiras.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Interpreta.ai é a plataforma de videoconferência Peer-to-Peer ultra-rápida,
              criada especificamente para eventos com tradução simultânea.
              Sem servidores caros, sem latência, apenas conexão pura.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button size="lg" className="h-16 px-10 text-lg bg-[#06b6d4] hover:bg-[#0891b2] text-white font-black rounded-2xl shadow-2xl shadow-[#06b6d4]/30 group transition-all" asChild>
                <Link href="/signup">
                  Começar Agora <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-border hover:bg-accent/50 text-foreground font-bold rounded-2xl transition-all">
                Ver Demonstração
              </Button>
            </motion.div>

            {/* Faux UI Preview */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1, ease: "circOut" }}
              className="mt-24 relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#06b6d4] to-indigo-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-card border border-border rounded-[2rem] p-4 shadow-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10" />
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 w-full h-full p-8 opacity-40">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-1/2 h-12 bg-white/5 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/80" />
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="w-24 h-6 rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/50" />
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                </div>
                <div className="absolute inset-0 bg-[#06b6d4]/5 mix-blend-overlay pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-black/40 border-y border-white/5 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black tracking-tighter mb-4 text-foreground uppercase">Desenvolvido para Performance</h2>
              <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Tudo o que você precisa para conexões impecáveis.</p>
            </div>

            <motion.div
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              {[
                {
                  icon: Zap,
                  title: "Latência Zero",
                  desc: "Arquitetura P2P Mesh que remove servidores intermediários e garante conexão direta entre os participantes.",
                  color: "text-amber-400"
                },
                {
                  icon: Globe,
                  title: "Multicanais Nativos",
                  desc: "Mixer de áudio sofisticado integrado. Ouça o orador e o intérprete simultaneamente com controle de balanço.",
                  color: "text-[#06b6d4]"
                },
                {
                  icon: Shield,
                  title: "Privado & Seguro",
                  desc: "Seus dados de voz e vídeo trafegam criptografados de ponta a ponta. Zero armazenamento em nuvem.",
                  color: "text-emerald-400"
                },
                {
                  icon: Mic,
                  title: "Console Profissional",
                  desc: "Ferramentas dedicadas para intérpretes focarem no que importa: a fidelidade da tradução.",
                  color: "text-purple-400"
                },
                {
                  icon: Users,
                  title: "Foco no Evento",
                  desc: "Interface limpa e minimalista que não distrai os participantes. Experiência de cinema em casa.",
                  color: "text-rose-400"
                },
                {
                  icon: MonitorSmartphone,
                  title: "Multi-dispositivo",
                  desc: "Acesse pelo computador, tablet ou celular sem instalar aplicativos pesados. Tudo via navegador.",
                  color: "text-indigo-400"
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  className="p-8 rounded-[2rem] bg-card border border-border hover:border-[#06b6d4]/30 hover:bg-accent/50 transition-all group shadow-sm"
                >
                  <div className={`p-4 rounded-2xl bg-accent/50 w-fit mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="py-20 border-t border-border bg-card">
          <div className="container mx-auto px-6 flex flex-col items-center gap-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#06b6d4] rounded-lg flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground">
                Interpreta<span className="text-[#06b6d4]">.ai</span>
              </span>
            </div>

            <div className="flex gap-8 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
            </div>

            <div className="text-center">
              <p className="text-muted-foreground text-xs">© 2025 Interpreta.ai - A Revolução da Tradução P2P.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
