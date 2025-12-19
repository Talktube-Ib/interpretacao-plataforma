
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function SignupPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // 1. Sign up the user
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'user', // Simplified role system: admin or user
                },
            },
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        // 2. Insert into users table (if trigger not set up, manual insert logic might be needed here usually, 
        // but for MVP we rely on auth metadata or a separate trigger. 
        // For simplicity efficiently, we will rely on metadata or assume the user table sync exists. 
        // If not, we can just use auth.user metadata for now).

        // For this MVP, we redirect to login or dashboard. 
        // If email confirmation is off, it goes to dashboard.

        // Check if session exists (email confirmation off)
        if (data.session) {
            router.push('/dashboard')
            router.refresh()
        } else {
            setError('Verifique seu email para confirmar o cadastro.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020817] p-4 relative overflow-hidden">
            {/* Background patterns */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="w-full max-w-md space-y-8 relative z-10 bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-black tracking-tighter text-white italic">
                        Interpreta<span className="text-[#06b6d4]">.ai</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Crie sua conta gratuita
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="fullname" className="text-gray-300">Nome Completo</Label>
                            <Input
                                id="fullname"
                                name="fullname"
                                type="text"
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 mt-1"
                                placeholder="Seu Nome"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
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
                                autoComplete="new-password"
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 mt-1"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-semibold py-2.5"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Conta'}
                    </Button>

                    <div className="text-center text-sm">
                        <Link href="/login" className="text-[#06b6d4] hover:underline">
                            Já tem uma conta? Entre
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
