'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import { Logo } from '@/components/logo'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const errorType = searchParams.get('error')
        const status = searchParams.get('status')

        if (errorType === 'account_locked') {
            // Delay state update to avoid synchronous render warning
            const timer = setTimeout(() => {
                if (status === 'banned') {
                    setError('Sua conta foi banida permanentemente. Entre em contato com o suporte.')
                } else if (status === 'suspended') {
                    setError('Sua conta está suspensa temporariamente. Entre em contato com o suporte.')
                } else {
                    setError('Acesso negado. Sua conta não está ativa.')
                }
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020817] p-4 relative overflow-hidden">
            {/* Background patterns */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="w-full max-w-md space-y-8 relative z-10 bg-black/40 backdrop-blur-sm md:backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-2xl">
                <div className="text-center flex flex-col items-center">
                    <Logo className="scale-150 mb-4" />
                    <p className="mt-2 text-sm text-gray-400">
                        Acesse sua conta para continuar
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 mt-1"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="password" className="text-gray-300">Senha</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 mt-1"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
                            >
                                Esqueceu sua senha?
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-semibold py-2.5"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar na Plataforma'}
                    </Button>
                </form>

                <p className="text-xs text-gray-500 mt-4 text-center">
                    Não possui conta? Entre em contato com nosso time comercial.
                </p>
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
