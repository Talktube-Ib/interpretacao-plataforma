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

        // Validation could be here too, but server handles it well.
        try {
            const result = await updatePassword(formData)
            if (result && result.error) {
                setError(result.error)
            }
        } catch (e) {
            setError('Ocorreu um erro inesperado.')
        } finally {
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
