"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react'
import { Logo } from '@/components/logo'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/components/providers/language-provider'

export default function ContactPage() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setLoading(false)
        setSuccess(true)
    }

    return (
        <div className="min-h-screen flex bg-[#020817] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />

            {/* LEFT SIDE: Visual & Benefits */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative z-10 border-r border-white/5 bg-black/20">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Link href="/">
                        <Logo className="scale-125 origin-left" />
                    </Link>
                </motion.div>

                <div className="space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-md"
                    >
                        <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">
                            {t('landing.contact_sidebar_title')}
                        </h2>
                        <p className="mt-4 text-gray-400 text-lg">
                            {t('landing.contact_subtitle')}
                        </p>
                    </motion.div>

                    <div className="space-y-6">
                        {[
                            t('landing.contact_sidebar_benefit_1'),
                            t('landing.contact_sidebar_benefit_2'),
                            t('landing.contact_sidebar_benefit_3')
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                                className="flex items-center gap-4 text-gray-300"
                            >
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                    <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                                </div>
                                <span className="font-medium">{benefit}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="text-gray-500 text-sm"
                >
                    {t('landing.footer_copyright')}
                </motion.p>
            </div>

            {/* RIGHT SIDE: Contact Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    <div className="lg:hidden mb-12 flex justify-center">
                        <Link href="/">
                            <Logo className="scale-125" />
                        </Link>
                    </div>

                    <div className="space-y-2 mb-10">
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <MessageSquare className="text-cyan-500 h-8 w-8" />
                            {t('landing.contact_title')}
                        </h1>
                        <p className="text-gray-400">
                            {t('landing.contact_subtitle')}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
                            >
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm font-medium text-gray-300 ml-1">
                                                {t('landing.contact_name_label')}
                                            </Label>
                                            <Input
                                                id="name"
                                                required
                                                className="bg-black/40 border-white/5 text-white h-12 px-4 rounded-xl focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                                                placeholder="Seu nome"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-sm font-medium text-gray-300 ml-1">
                                                {t('landing.contact_email_label')}
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                className="bg-black/40 border-white/5 text-white h-12 px-4 rounded-xl focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                                                placeholder="exemplo@empresa.com"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="message" className="text-sm font-medium text-gray-300 ml-1">
                                                {t('landing.contact_message_label')}
                                            </Label>
                                            <Textarea
                                                id="message"
                                                required
                                                className="bg-black/40 border-white/5 text-white min-h-[120px] px-4 py-3 rounded-xl focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all resize-none"
                                                placeholder="Fale um pouco sobre o seu evento..."
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 rounded-xl transition-all shadow-[0_20px_40px_-12px_rgba(8,145,178,0.3)] hover:shadow-[0_24px_48px_-12px_rgba(8,145,178,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Aguarde...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>{t('landing.contact_button')}</span>
                                                <Send className="h-4 w-4" />
                                            </div>
                                        )}
                                    </Button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-cyan-500/10 border border-cyan-500/30 p-12 rounded-3xl text-center space-y-6"
                            >
                                <div className="h-20 w-20 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_40px_-8px_rgba(6,182,212,0.5)]">
                                    <CheckCircle2 className="h-10 w-10 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white">{t('landing.contact_success')}</h3>
                                    <p className="text-gray-400">Nossa equipe entrará em contato em até 24h.</p>
                                </div>
                                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                                    <Link href="/">Voltar para Início</Link>
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-10 text-center">
                        <Link href="/login" className="text-gray-500 text-sm hover:text-cyan-400 transition-colors">
                            {t('landing.login_title')}
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Orbs */}
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        </div>
    )
}
