'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/components/providers/language-provider'

function LoginForm() {
    const { t } = useLanguage()
    const [email, setEmail] = useState('')
    const [emailError, setEmailError] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const errorType = searchParams.get('error')
        const status = searchParams.get('status')

        if (errorType === 'account_locked' || errorType === 'access_denied') {
            // Delay state update to avoid synchronous render warning
            const timer = setTimeout(() => {
                if (status === 'banned') {
                    setError('login_error_banned')
                } else if (status === 'suspended') {
                    setError('login_error_suspended')
                } else {
                    setError('login_error_denied')
                }
            }, 0)
            return () => clearTimeout(timer)
        } else if (errorType === 'connection_timeout') {
            setError('login_error_timeout')
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const cleanEmail = email.trim()

        // Basic client-side sanitization/validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setError('login_error_email')
            setEmailError(true)
            setLoading(false)
            return
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
        })

        if (signInError) {
            setError(signInError.message === 'Invalid login credentials' ? 'login_error_invalid' : signInError.message)
            setLoading(false)
        } else {
            // It's important to keep loading state until the router actually navigates
            // but router.push doesn't block. We'll refresh to ensure the session is picked up.
            router.refresh()
            router.push('/dashboard')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden p-6">
            {/* Background Base */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.08),transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-10 pointer-events-none" />

            {/* MAIN LOGIN CONTAINER (STANDARD & CLEAN) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md z-30 relative"
            >
                {/* Central Logo */}
                <div className="mb-12 flex justify-center">
                    <Logo className="scale-110" />
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    {/* Subtle internal glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

                    <div className="space-y-2 mb-10 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">
                            {t('landing.login_title')}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {t('landing.login_subtitle')}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                    {t('landing.login_email_label')}
                                </Label>
                                <div className="relative group">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="bg-black/40 border-white/5 text-white h-14 px-5 rounded-2xl focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="exemplo@empresa.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            if (emailError) setEmailError(false)
                                        }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <Label htmlFor="password" className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        {t('landing.login_password_label')}
                                    </Label>
                                    <Link href="/auth/forgot-password" title="Esqueceu?" className="text-[10px] text-cyan-500/70 hover:text-cyan-400 transition-colors font-bold uppercase tracking-tighter">
                                        {t('landing.login_forgot_password')}
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="bg-black/40 border-white/5 text-white h-14 px-5 pr-14 rounded-2xl focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700" />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs font-medium"
                                >
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error.startsWith('login_error_') ? (t(`landing.${error}` as any)) : error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            type="submit"
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black h-14 rounded-2xl transition-all shadow-[0_20px_40px_-12px_rgba(8,145,178,0.4)] hover:shadow-[0_24px_48px_-12px_rgba(8,145,178,0.5)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 text-lg uppercase tracking-tighter"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('landing.login_button')}
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <Link href="/contact" className="text-[11px] font-bold text-gray-500 hover:text-cyan-400 transition-all uppercase tracking-[0.2em] group">
                            {t('landing.login_no_account')} <span className="text-white group-hover:text-cyan-400 underline decoration-cyan-500/30 underline-offset-4 decoration-2">{t('landing.login_contact_sales')}</span>
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Fixed Bottom Left: Copyright (Editorial feel) */}
            <div className="fixed bottom-8 left-8 text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] font-mono pointer-events-none hidden xl:block">
                © 2025 TALKTUBE CORP. / ALL RIGHTS RESERVED
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#020817]">
                <Loader2 className="h-8 w-8 text-[#06b6d4] animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
