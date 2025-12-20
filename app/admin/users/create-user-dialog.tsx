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
import { UserPlus, Loader2 } from 'lucide-react'
import { createUser } from '../actions'

export function CreateUserDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            await createUser(formData)
            setOpen(false)
            alert('Convite enviado com sucesso!')
        } catch (error) {
            console.error(error)
            alert('Erro ao criar usuário: ' + (error as Error).message)
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
                                'Enviar Convite'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
