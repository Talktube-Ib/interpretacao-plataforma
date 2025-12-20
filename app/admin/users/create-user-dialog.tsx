'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UserPlus, Loader2, Key, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { createUser } from '../actions'

export function CreateUserDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Password Strength Calculation
    const getStrength = (pass: string) => {
        let score = 0
        if (!pass) return 0
        if (pass.length > 7) score += 1
        if (pass.length > 10) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        return score
    }

    const strength = getStrength(password)
    const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500'][strength] || 'bg-red-500'
    const strengthText = ['Muito Fraca', 'Fraca', 'Média', 'Boa', 'Forte', 'Excelente'][strength] || 'Muito Fraca'

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
        let retVal = ""
        for (let i = 0, n = charset.length; i < 16; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n))
        }
        setPassword(retVal)
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await createUser(formData)

            if (result.success) {
                setOpen(false)
                setPassword('')
                alert('Usuário criado com sucesso! Envie as credenciais para o usuário.')
            } else {
                alert('Erro ao criar usuário: ' + (result as any).error)
            }
        } catch (error) {
            console.error(error)
            alert('Erro inesperado: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar Usuário
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#020817] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Usuário</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            required
                            placeholder="Ex: João da Silva"
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="joao@exemplo.com"
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Senha Inicial</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 pr-10"
                                    placeholder="Senha segura..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button type="button" variant="outline" onClick={generatePassword} title="Gerar Senha Forte" className="border-white/10 bg-white/5 hover:bg-white/10">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Password Strength Meter */}
                        {password && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Força: <span className="text-white font-medium">{strengthText}</span></span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${strengthColor}`}
                                        style={{ width: `${(strength / 5) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">Função / Cargo</Label>
                        <Select name="role" defaultValue="participant">
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="participant">Usuário Padrão</SelectItem>
                                <SelectItem value="interpreter">Intérprete</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full bg-[#06b6d4] hover:bg-[#0891b2]">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Criar Usuário'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
