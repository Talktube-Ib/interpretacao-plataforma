'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/update-password`,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020817] p-4 relative overflow-hidden">
            {/* Background patterns */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="w-full max-w-md space-y-8 relative z-10 bg-black/40 backdrop-blur-sm md:backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-2xl">
                <div className="text-center flex flex-col items-center">
                    <Logo className="scale-125 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h2>
                    <p className="text-sm text-gray-400">
                        Digite seu email para receber o link de redefinição
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-4 animate-in fade-in zoom-in">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Email Enviado!</h3>
                        <p className="text-gray-400">
                            Verifique sua caixa de entrada (e spam) para redefinir sua senha.
                        </p>
                        <Button variant="outline" className="w-full mt-4 border-white/10 text-white hover:bg-white/5" asChild>
                            <Link href="/login">Voltar para o Login</Link>
                        </Button>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleReset}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email" className="text-gray-300">Email cadastrado</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 mt-1"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-semibold py-2.5"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Link de Recuperação'}
                        </Button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm text-gray-500 hover:text-white flex items-center justify-center gap-2 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Voltar para o login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
