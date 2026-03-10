"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Mic,
  Video,
  Globe,
  CheckCircle2,
  ArrowRight,
  Shield,
  ShieldCheck,
  Zap,
  TrendingUp,
  ChevronDown,
  Headphones,
  User,
  Menu
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet"

import { Logo } from '@/components/logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { motion, Variants, useScroll, useSpring, useTransform } from 'framer-motion'
import { useLanguage } from '@/components/providers/language-provider'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'
import { useState, useRef, useEffect, Suspense } from 'react'
import { GlobalConnectionGlobe } from '@/components/visual/global-connection-globe'

export default function LandingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Parallax transforms for background elements
  const globeY = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  const faqSchema = {
    ["@context"]: "https://schema.org",
    ["@type"]: "FAQPage",
    "mainEntity": [
      {
        ["@type"]: "Question",
        "name": t('landing.faq_1_q'),
        "acceptedAnswer": {
          ["@type"]: "Answer",
          "text": t('landing.faq_1_a')
        }
      },
      {
        ["@type"]: "Question",
        "name": t('landing.faq_2_q'),
        "acceptedAnswer": {
          ["@type"]: "Answer",
          "text": t('landing.faq_2_a')
        }
      },
      {
        ["@type"]: "Question",
        "name": t('landing.faq_3_q'),
        "acceptedAnswer": {
          ["@type"]: "Answer",
          "text": t('landing.faq_3_a')
        }
      },
      {
        ["@type"]: "Question",
        "name": t('landing.faq_4_q'),
        "acceptedAnswer": {
          ["@type"]: "Answer",
          "text": t('landing.faq_4_a')
        }
      }
    ]
  };

  const softwareSchema = {
    ["@context"]: "https://schema.org",
    ["@type"]: "SoftwareApplication",
    "name": "TalkTube",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "offers": {
      ["@type"]: "Offer",
      "price": "178.00",
      "priceCurrency": "BRL"
    },
    "aggregateRating": {
      ["@type"]: "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "124"
    }
  };

  // Add hydration check to prevent useScroll issues during SSR/Pre-rendering
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    <div ref={containerRef} className="min-h-screen bg-[#020817] text-white overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 z-[60] origin-left"
        style={{ scaleX }}
      />

      {/* Background Effects (Elite 3D Anchor) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
        <motion.div style={{ y: globeY }} className="absolute inset-0">
          <Suspense fallback={<div className="absolute inset-0 bg-[#020617]" />}>
            <GlobalConnectionGlobe />
          </Suspense>
        </motion.div>

        {/* Ambient Vignette for Editorial depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_80%)] opacity-60" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-md bg-[#020817]/80 sticky top-0">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo className="scale-110" />
            <div className="hidden md:flex items-center gap-1">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                {t('landing.badge_enterprise')}
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">{t('landing.features')}</Link>
            <Link href="#tech" className="hover:text-white transition-colors">{t('landing.about')}</Link>
            <Link href="#use-cases" className="hover:text-white transition-colors">{t('landing.use_cases_title')}</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">{t('landing.pricing')}</Link>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login" className="hidden md:block">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5 font-medium">
                {t('landing.client_area')}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-gray-300 hover:text-white hover:bg-white/5">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#020817] border-white/10 text-white w-[300px]">
                <SheetHeader>
                  <SheetTitle className="text-left mb-6">
                    <Logo className="scale-90" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 font-medium text-lg">
                  <SheetClose asChild>
                    <Link href="#features" className="text-gray-400 hover:text-cyan-400 transition-colors">
                      {t('landing.features')}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="#tech" className="text-gray-400 hover:text-cyan-400 transition-colors">
                      {t('landing.about')}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="#use-cases" className="text-gray-400 hover:text-cyan-400 transition-colors">
                      {t('landing.use_cases_title')}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="#pricing" className="text-gray-400 hover:text-cyan-400 transition-colors">
                      {t('landing.pricing')}
                    </Link>
                  </SheetClose>
                  <div className="h-px bg-white/10 my-2" />
                  <SheetClose asChild>
                    <Link href="/login" className="flex items-center gap-2 text-cyan-400">
                      <User className="w-5 h-5" />
                      {t('landing.client_area')}
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold tracking-wider uppercase text-cyan-400 mb-8 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Excelência em Interpretação • Alta Eficiência
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight"
            >
              Interpretação Simultânea <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Humana Profissional
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              Comunicação fluida e precisa para seus eventos e reuniões corporativas,
              com a confiança de intérpretes especialistas em tempo real.
            </motion.p>



            <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6 justify-center pt-12">
              <Button size="lg" className="h-16 px-10 text-lg bg-cyan-500 text-black hover:bg-cyan-400 rounded-2xl font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all group overflow-hidden relative">
                <span className="relative z-10 flex items-center gap-2">
                  Começar Agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-2xl backdrop-blur-md transition-all border-white/20" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                {t('landing.cta_specialist')}
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* TRUST INDICATORS */}
        <section className="py-10 border-y border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">{t('landing.trust_leaders')}</p>
            <div className="w-full overflow-hidden flex">
              <div className="flex animate-[scroll_10s_linear_infinite] w-max gap-12 min-w-full items-center">
                {/* Logos Set 1 */}
                <img src="/logos/vale.png" alt="Vale" className="h-12 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/bndes.png" alt="BNDES" className="h-16 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/petrobras.png" alt="Petrobras" className="h-8 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/logo4.png" alt="Partner" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/bbc.png" alt="BBC" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />

                {/* Logos Set 2 (Duplicate for loop) */}
                <img src="/logos/vale.png" alt="Vale" className="h-12 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/bndes.png" alt="BNDES" className="h-16 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/petrobras.png" alt="Petrobras" className="h-8 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/logo4.png" alt="Partner" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
                <img src="/logos/bbc.png" alt="BBC" className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500" />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Tecnologia dedicada à clareza
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                {t('landing.tech_section_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <motion.div
                whileHover={{ y: -10 }}
                className="p-10 rounded-[2.5rem] border border-white/10 bg-[#0a0f1e]/50 backdrop-blur-xl hover:border-cyan-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-blue-500/20 shadow-inner">
                  <Video className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.feature_1_title')}</h3>
                <p className="text-gray-400 leading-relaxed text-lg font-light">
                  Sessões de vídeo em altíssima definição com redundância global para garantir estabilidade absoluta.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                whileHover={{ y: -10 }}
                className="p-10 rounded-[2.5rem] border border-white/10 bg-[#0a0f1e]/50 backdrop-blur-xl hover:border-purple-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors" />
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-purple-500/20 shadow-inner">
                  <Mic className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.feature_2_title')}</h3>
                <p className="text-gray-400 leading-relaxed text-lg font-light">
                  Captura de áudio cristalina processada em nuvem com cancelamento de ruído por IA de última geração.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                whileHover={{ y: -10 }}
                className="p-10 rounded-[2.5rem] border border-white/10 bg-[#0a0f1e]/50 backdrop-blur-xl hover:border-emerald-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-inner">
                  <Globe className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.feature_3_title')}</h3>
                <p className="text-gray-400 leading-relaxed text-lg font-light">
                  Intérpretes de elite em todo o mundo conectados por uma rede de baixa latência para uma experiência natural.
                </p>
              </motion.div>
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
                      <h3 className="text-xl font-bold text-white mb-2">{t('landing.use_case_1_title')}</h3>
                      <p className="text-gray-400">{t('landing.use_case_1_desc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex-shrink-0 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-cyan-500 font-bold">02</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('landing.use_case_2_title')}</h3>
                      <p className="text-gray-400">{t('landing.use_case_2_desc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex-shrink-0 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-cyan-500 font-bold">03</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('landing.use_case_3_title')}</h3>
                      <p className="text-gray-400">{t('landing.use_case_3_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full" />
                <div className="relative rounded-2xl border border-white/10 bg-[#020817] p-2 shadow-2xl">
                  <img src="/images/hybrid-event.jpg" alt="Eventos Híbridos" className="rounded-xl opacity-80 hover:opacity-100 transition-opacity duration-500" />

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

        {/* HOW IT WORKS */}
        <section className="py-24 relative overflow-hidden bg-white/[0.01]">
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                {t('landing.how_it_works_title')}
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                {t('landing.how_it_works_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-[72px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

              {[1, 2, 3].map((step) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: step * 0.2 }}
                  className="flex flex-col items-center text-center relative"
                >
                  <div className="w-16 h-16 rounded-3xl bg-[#0d152b] border border-cyan-500/30 flex items-center justify-center text-2xl font-black text-cyan-400 mb-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative z-10">
                    {step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {t(`landing.step_${step}_title` as any)}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {t(`landing.step_${step}_desc` as any)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Planos simples e transparentes
              </h2>
              <p className="text-gray-400 text-lg">
                Escolha a melhor opção para a frequência dos seus eventos.
                Cancele a qualquer momento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Monthly */}
              <motion.div
                whileHover={{ y: -5 }}
                className="p-8 rounded-[2.5rem] border border-white/5 bg-[#0a0f1e]/40 backdrop-blur-xl flex flex-col group transition-all hover:border-white/10"
              >
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-widest">{t('landing.plan_monthly_name')}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-white tracking-tight">{t('landing.plan_monthly_price')}</span>
                    <span className="text-gray-500 text-sm">{t('landing.plan_monthly_period')}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{t('landing.plan_monthly_desc')}</p>
                </div>

                <div className="space-y-4 mb-10 flex-grow">
                  {[1, 2, 3, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-cyan-500/70" />
                      <span>{t(`landing.plan_feature_${i}` as any)}</span>
                    </div>
                  ))}
                </div>

                <Link href={t('landing.plan_monthly_link')} className="mt-auto">
                  <Button className="w-full h-14 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl transition-all font-bold">
                    {t('landing.button_subscribe')}
                  </Button>
                </Link>
              </motion.div>

              {/* Semiannual - FEATURED */}
              <motion.div
                initial={{ scale: 0.95 }}
                whileInView={{ scale: 1 }}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[2.5rem] border-2 border-cyan-500/50 bg-[#0d152b] relative flex flex-col shadow-[0_20px_80px_rgba(6,182,212,0.15)] z-10 overflow-hidden"
              >
                {/* Glow Effect */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="absolute top-6 right-8 bg-cyan-500 text-black text-[10px] font-black px-3 py-1 rounded-full tracking-tighter uppercase shadow-lg">
                  Mais Popular
                </div>

                <div className="mb-8 relative z-10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-widest">{t('landing.plan_semiannual_name')}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-6xl font-black text-white tracking-tighter">{t('landing.plan_semiannual_price')}</span>
                    <span className="text-cyan-500/50 text-sm font-bold">{t('landing.plan_semiannual_period')}</span>
                  </div>
                  <p className="text-cyan-100/60 text-sm leading-relaxed font-medium">{t('landing.plan_semiannual_desc')}</p>
                </div>

                <div className="space-y-4 mb-10 flex-grow relative z-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-white/90">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                      <span>{t(`landing.plan_feature_${i}` as any)}</span>
                    </div>
                  ))}
                </div>

                <Link href={t('landing.plan_semiannual_link')} className="mt-auto relative z-10">
                  <Button className="w-full h-16 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-2xl shadow-[0_15px_30px_rgba(6,182,212,0.4)] transition-all text-lg group">
                    {t('landing.button_subscribe')}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>

              {/* Annual */}
              <motion.div
                whileHover={{ y: -5 }}
                className="p-8 rounded-[2.5rem] border border-white/5 bg-[#0a0f1e]/40 backdrop-blur-xl flex flex-col group transition-all hover:border-white/10"
              >
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-widest">{t('landing.plan_yearly_name')}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-white tracking-tight">{t('landing.plan_yearly_price')}</span>
                    <span className="text-gray-500 text-sm">{t('landing.plan_yearly_period')}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{t('landing.plan_yearly_desc')}</p>
                </div>

                <div className="space-y-4 mb-10 flex-grow">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-cyan-500/70" />
                      <span>{t(`landing.plan_feature_${i}` as any)}</span>
                    </div>
                  ))}
                </div>

                <Link href={t('landing.plan_yearly_link')} className="mt-auto">
                  <Button className="w-full h-14 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl transition-all font-bold">
                    {t('landing.button_subscribe')}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ - Specialized */}
        <section className="py-24 bg-[#020817] border-t border-white/5">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">{t('landing.faq_title')}</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  {t('landing.faq_1_q')}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {t('landing.faq_1_a')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  {t('landing.faq_2_q')}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {t('landing.faq_2_a')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  {t('landing.faq_3_q')}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {t('landing.faq_3_a')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-white/10">
                <AccordionTrigger className="text-lg text-white hover:text-cyan-400 hover:no-underline text-left">
                  {t('landing.faq_4_q')}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {t('landing.faq_4_a')}
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
              {t('landing.ready_to_globalize')}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="h-16 px-10 text-lg bg-white text-[#020817] hover:bg-gray-100 rounded-full font-bold shadow-2xl hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-1"
                asChild
              >
                <Link href="/login">
                  Começar Agora
                </Link>
              </Button>
            </div>
            <p className="mt-8 text-sm text-gray-500">
              {t('landing.no_credit_card')}
            </p>
          </div>
        </section>


        {/* ABOUT INTERPRET BRASIL SECTION */}
        <section className="py-24 bg-[#020611] border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-900/5 blur-3xl rounded-full" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6">
                  {t('landing.backed_by_exp')}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  {t('landing.initiative_ib')} <span className="text-cyan-400">{t('landing.initiative_ib_name')}</span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  {t('landing.talktube_desc_1')} <strong>IB - {t('landing.talktube_desc_2')}</strong>{t('landing.talktube_desc_3')}
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://interpretbrasil.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all hover:scale-105"
                  >
                    {t('landing.meet_ib')} <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="relative order-1 lg:order-2">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full" />
                <div className="relative rounded-2xl border border-white/10 bg-[#020817] p-2 shadow-2xl">
                  <div className="aspect-video relative rounded-xl overflow-hidden">
                    <img
                      src="/images/ib-meeting.jpg"
                      alt="Reunião Presencial Interpret Brasil"
                      className="absolute inset-0 w-full h-full object-cover object-center opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
                      <span className="text-xl font-bold text-white block mb-0.5">{t('landing.years_excellence')}</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">de Excelência</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-16" />

            <div className="text-center">
              <blockquote className="text-2xl md:text-3xl font-serif italic text-cyan-200/90 max-w-3xl mx-auto leading-relaxed">
                &quot;{t('landing.quote')}&quot;
              </blockquote>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 bg-[#010409]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
          <Logo className="scale-90 mb-4 md:mb-0" />
          <div className="text-xs text-gray-600">
            {t('landing.footer_copyright')}
          </div>
        </div>
      </footer>
      <FloatingWhatsApp />
    </div >
  )
}
