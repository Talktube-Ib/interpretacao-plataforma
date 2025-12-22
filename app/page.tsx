"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Mic,
  Video,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Headphones
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Logo } from '@/components/logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLanguage } from '@/components/providers/language-provider'
import { motion, Variants } from 'framer-motion'
import { startDemoMode } from '@/app/actions/demo'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'

export default function LandingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  const handleDemoClick = async () => {
    setIsLoadingDemo(true)
    try {
      await startDemoMode()
    } catch (error) {
      console.error("Demo start failed", error)
      setIsLoadingDemo(false)
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-md bg-[#020817]/80 sticky top-0">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo className="scale-110" />
            <div className="hidden md:flex items-center gap-1">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                Enterprise
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#tech" className="hover:text-white transition-colors">Tecnologia</Link>
            <Link href="#use-cases" className="hover:text-white transition-colors">Casos de Uso</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">{t('landing.pricing') || 'Planos'}</Link>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5 font-medium">
                Área do Cliente
              </Button>
            </Link>
            <Button
              onClick={handleDemoClick}
              className="bg-white text-[#020817] hover:bg-gray-100 font-bold px-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isLoadingDemo ? 'Iniciando...' : 'Testar Demonstração'}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 pt-20 pb-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-5xl mx-auto space-y-8"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-cyan-400 mb-6 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Tecnologia de Tradução Simultânea P2P
              </div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.1] text-white">
              Sua reunião multilíngue com<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                interpretação simultânea humana
              </span><br />
              em qualquer idioma.
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed font-light">
              Perfeita para eventos multilíngue presenciais, híbridos e totalmente remotos com interpretação simultânea feita por profissionais especializados no seu idioma e ramo de trabalho.
            </motion.p>



            <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4 justify-center pt-8">
              <Button
                size="lg"
                onClick={handleDemoClick}
                className="h-14 px-8 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full font-semibold shadow-[0_0_40px_-5px_rgba(6,182,212,0.5)] transition-all hover:scale-105"
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {t('landing.cta_demo') || 'Experimentar Agora'} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-full backdrop-blur-sm" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver Planos
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* TRUST INDICATORS */}
        <section className="py-10 border-y border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">Confiança de líderes globais</p>
            <div className="flex flex-wrap justify-center items-center gap-12">
              {/* Logos */}
              <img src="/logos/vale.png" alt="Vale" className="h-12 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
              <img src="/logos/bndes.png" alt="BNDES" className="h-16 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
              <img src="/logos/petrobras.png" alt="Petrobras" className="h-8 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
              <img src="/logos/logo4.png" alt="Partner" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
              <img src="/logos/bbc.png" alt="BBC" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-32 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Engenharia de Precisão
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Cada funcionalidade foi construída para garantir a máxima clareza e estabilidade em comunicações críticas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Video className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Vídeo HD 50 FPS</h3>
                <p className="text-gray-400 leading-relaxed">
                  Qualidade cristalina com adaptação dinâmica de largura de banda. Seus intérpretes verão cada expressão facial, garantindo uma tradução mais precisa.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Mic className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Canais de Áudio Isolados</h3>
                <p className="text-gray-400 leading-relaxed">
                  Arquitetura de áudio multi-track permite que intérpretes trabalhem sem interferência, enquanto ouvintes selecionam seu idioma preferido instantaneamente.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Cobertura Global P2P</h3>
                <p className="text-gray-400 leading-relaxed">
                  Nossa malha peer-to-peer conecta participantes diretamente, reduzindo a latência para milissegundos, independentemente da localização geográfica.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section id="use-cases" className="py-24 bg-[#050b1d] border-t border-white/5">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                  Perfeito para eventos híbridos e remotos
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex-shrink-0 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-cyan-500 font-bold">01</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Conferências Internacionais</h3>
                      <p className="text-gray-400">Conecte palestrantes e audiências de múltiplos países sem o custo logístico de cabines físicas.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex-shrink-0 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-cyan-500 font-bold">02</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Treinamentos Corporativos</h3>
                      <p className="text-gray-400">Garanta que sua força de trabalho global receba treinamento em sua língua nativa com precisão técnica.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex-shrink-0 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-cyan-500 font-bold">03</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Reuniões de Conselho</h3>
                      <p className="text-gray-400">Segurança de nível empresarial e latência zero para tomadas de decisão críticas.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full" />
                <div className="relative rounded-2xl border border-white/10 bg-[#020817] p-2 shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1600&h=900" alt="Meeting Dashboard" className="rounded-xl opacity-80" />

                  {/* Floating Card */}
                  <div className="absolute -bottom-8 -left-8 bg-[#0a0f1e] p-4 rounded-xl border border-white/10 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Status do Sistema</span>
                    </div>
                    <div className="text-white font-mono text-sm">
                      Latência: <span className="text-green-400">24ms</span><br />
                      Canais Ativos: <span className="text-cyan-400">3 (EN, PT, ES)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {t('landing.pricing_title') || 'Planos Flexíveis'}
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                {t('landing.pricing_subtitle') || 'Escolha a melhor opção para sua organização.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Monthly */}
              <div className="p-8 rounded-3xl border border-white/10 bg-[#0a0f1e] hover:border-cyan-500/30 transition-all flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">{t('landing.plan_monthly_name') || 'Mensal'}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{t('landing.plan_monthly_price')}</span>
                  <span className="text-gray-500 text-sm ml-2">{t('landing.plan_monthly_period')}</span>
                </div>
                <p className="text-gray-400 text-sm mb-8 flex-grow">{t('landing.plan_monthly_desc')}</p>
                <Link href="/login">
                  <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
                    {t('landing.button_subscribe') || 'Começar Agora'}
                  </Button>
                </Link>
              </div>

              {/* Semiannual */}
              <div className="p-8 rounded-3xl border border-cyan-500/50 bg-[#0a0f1e] relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-cyan-900/20">
                <div className="absolute top-0 right-0 bg-cyan-500 text-[#020817] text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                  POPULAR
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('landing.plan_semiannual_name') || 'Semestral'}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{t('landing.plan_semiannual_price')}</span>
                  <span className="text-gray-500 text-sm ml-2">{t('landing.plan_semiannual_period')}</span>
                </div>
                <p className="text-gray-400 text-sm mb-8 flex-grow">{t('landing.plan_semiannual_desc')}</p>
                <Link href="/login">
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#020817] font-bold">
                    {t('landing.button_subscribe') || 'Começar Agora'}
                  </Button>
                </Link>
              </div>

              {/* Annual */}
              <div className="p-8 rounded-3xl border border-white/10 bg-[#0a0f1e] hover:border-cyan-500/30 transition-all flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">{t('landing.plan_yearly_name') || 'Anual'}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{t('landing.plan_yearly_price')}</span>
                  <span className="text-gray-500 text-sm ml-2">{t('landing.plan_yearly_period')}</span>
                </div>
                <p className="text-gray-400 text-sm mb-8 flex-grow">{t('landing.plan_yearly_desc')}</p>
                <Link href="/login">
                  <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
                    {t('landing.button_subscribe') || 'Começar Agora'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Specialized */}
        <section className="py-24 bg-[#020817] border-t border-white/5">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Perguntas Frequentes</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  Preciso instalar algum software?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Não. Nossa plataforma é 100% baseada em navegador (WebRTC), funcionando nativamente no Chrome, Edge, Firefox e Safari sem plugins ou downloads.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  Qual é o limite de participantes?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Nossa arquitetura escala horizontalmente. Suportamos de pequenas reuniões executivas a webinars com milhares de espectadores passivos, mantendo a qualidade do áudio da interpretação.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  Posso testar antes de decidir?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Sim! Oferecemos <strong>7 dias de garantia incondicional</strong>. Você assina, utiliza a plataforma completa e, se por qualquer motivo não ficar satisfeito dentro da primeira semana, devolvemos 100% do seu dinheiro. Sem burocracia.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#020817] to-blue-950/20" />
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white tracking-tight">
              Pronto para globalizar sua comunicação?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={handleDemoClick}
                className="h-16 px-10 text-lg bg-white text-[#020817] hover:bg-gray-100 rounded-full font-bold shadow-2xl hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-1"
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Acessar Demonstração
              </Button>
            </div>
            <p className="mt-8 text-sm text-gray-500">
              Sem cartão de crédito. Acesso imediato ao ambiente de teste.
            </p>
          </div>
        </section>


        {/* ABOUT INTERPRET BRASIL SECTION */}
        <section className="py-24 bg-[#020611] border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-900/5 blur-3xl rounded-full" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="md:w-1/2">
                <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6">
                  Backed by Experience
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  Uma iniciativa da <span className="text-cyan-400">Interpret Brasil</span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  A TalkTube é um produto desenvolvido pela <strong>IB - Interpret Brasil</strong>, empresa líder com mais de 20 anos de experiência em tradução e interpretação de eventos globais. Combinamos a expertise humana de intérpretes renomados com tecnologia de ponta para entregar a melhor experiência de comunicação multilíngue.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://interpretbrasil.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all hover:scale-105"
                  >
                    Conheça a Interpret Brasil <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="md:w-1/2 relative">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-black rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
                  <img
                    src="/images/ib-meeting.jpg"
                    alt="Reunião Presencial Interpret Brasil"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-700"
                  />
                  <div className="relative z-10 bg-black/60 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-center">
                    <span className="text-2xl font-bold text-white block mb-1">20+ Anos</span>
                    <span className="text-sm text-gray-400 uppercase tracking-widest">de Excelência</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-16" />

            <div className="text-center">
              <blockquote className="text-2xl md:text-3xl font-serif italic text-cyan-200/90 max-w-3xl mx-auto leading-relaxed">
                "A comunicação oral é um fenômeno humano, vai além de palavras."
              </blockquote>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 bg-[#010409]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
          <Logo className="scale-90 mb-4 md:mb-0" />
          <div className="text-xs text-gray-600">
            &copy; 2024 Interpreta.ai. Todos os direitos reservados.
          </div>
        </div>
      </footer>
      <FloatingWhatsApp />
    </div >
  )
}
