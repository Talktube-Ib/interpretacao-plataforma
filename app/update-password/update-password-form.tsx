'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { updatePassword } from './actions'

export function UpdatePasswordForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        try {
            const result = await updatePassword(formData)
            if (result && result.error) {
                setError(result.error)
                setLoading(false)
            }
            // If successful, the server action 'updatePassword' calls redirect().
            // In Next.js, redirect() throws an error that is caught by the caller
            // or the framework. We must not catch it here OR re-throw it.
        } catch (e) {
            // Check if it's a Next.js redirect error (which is expected and uses 'NEXT_REDIRECT' string internally in some versions, 
            // but usually we just re-throw or don't catch everything).
            if (e instanceof Error && (e.message.includes('NEXT_REDIRECT') || e.message.includes('redirect'))) {
                throw e;
            }
            console.error('Update password error:', e)
            setError('Ocorreu um erro inesperado.')
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="mt-8 space-y-6">
            {error && (
                <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-center">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            className="bg-white/5 border-white/10 text-white pr-10"
                            placeholder="******"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="******"
                    />
                </div>
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold h-11"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atualizando...
                    </>
                ) : (
                    'Definir Nova Senha'
                )}
            </Button>
        </form>
    )
}
