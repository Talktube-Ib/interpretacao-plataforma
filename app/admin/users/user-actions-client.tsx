'use client'

import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "../../../components/ui/dialog"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Settings2, Languages } from 'lucide-react'
import React, { useState } from 'react'
import { updateUserRole, updateUserStatus, updateUserLimits, updateProfileLanguages, deleteUser, adminUpdateUserPassword } from '../actions'
import { LANGUAGES } from '@/lib/languages'
import { KeyRound } from 'lucide-react'

interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    status: 'active' | 'suspended' | 'banned';
    limits?: {
        max_meetings?: number;
        max_participants?: number;
        can_record?: boolean;
    };
    languages?: string[]; // Added languages
}

export function UserActionsClient({ profile }: { profile: Profile }): React.ReactNode {
    const status = profile.status || 'active'
    const [openLimits, setOpenLimits] = useState(false)
    const [openLang, setOpenLang] = useState(false)
    const [openPassword, setOpenPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const [limits, setLimits] = useState({
        max_meetings: profile.limits?.max_meetings || 5,
        max_participants: profile.limits?.max_participants || 50,
        can_record: profile.limits?.can_record || false
    })

    // Languages State
    const [selectedLangs, setSelectedLangs] = useState<string[]>(profile.languages || [])

    const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>, successMsg?: string) => {
        try {
            const result = await actionFn()
            if (!result.success) {
                alert(`Erro: ${result.error}`)
            } else {
                // Show server message if available (for debugging), or fall back to client successMsg
                if ('message' in result) {
                    alert(`Sucesso: ${(result as any).message}`)
                } else if (successMsg) {
                    alert(successMsg)
                }
            }
        } catch (err) {
            alert('Erro inesperado ao executar ação.')
        }
    }

    const handleSaveLimits = async () => {
        const result = await updateUserLimits(profile.id, limits)
        if (result.success) {
            setOpenLimits(false)
        } else {
            alert(`Erro ao salvar limites: ${result.error}`)
        }
    }

    const handleSavePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.')
            return
        }

        const result = await adminUpdateUserPassword(profile.id, newPassword)
        if (result.success) {
            setOpenPassword(false)
            setNewPassword('')
            alert('Senha alterada com sucesso!')
        } else {
            alert(`Erro ao alterar senha: ${result.error}`)
        }
    }

    const handlePromoteToInterpreter = async () => {
        setOpenLang(true)
    }

    const confirmInterpreterPromotion = async () => {
        const roleResult = await updateUserRole(profile.id, 'interpreter')
        if (!roleResult.success) {
            alert(`Erro ao atualizar papel: ${roleResult.error}`)
            return
        }

        const langResult = await updateProfileLanguages(profile.id, selectedLangs)
        if (!langResult.success) {
            alert(`Erro ao salvar idiomas: ${langResult.error}`)
            return
        }

        setOpenLang(false)
        alert('Usuário promovido a Intérprete com sucesso!')
    }

    const handleLangToggle = (code: string) => {
        if (selectedLangs.includes(code)) {
            setSelectedLangs(selectedLangs.filter(l => l !== code))
        } else {
            setSelectedLangs([...selectedLangs, code])
        }
    }

    return (
        <div className="flex items-center gap-2">
            {/* Password Reset Modal */}
            <Dialog open={openPassword} onOpenChange={setOpenPassword}>
                <DialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-[#06b6d4]" />
                            Alterar Senha de {profile.full_name || 'Usuário'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="newPassword" className="text-right">Nova Senha</Label>
                            <Input
                                id="newPassword"
                                type="text"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="col-span-3 bg-white/5 border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSavePassword} className="bg-[#06b6d4] hover:bg-[#0891b2]">
                            Salvar Nova Senha
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Limits Modal */}
            <Dialog open={openLimits} onOpenChange={setOpenLimits}>
                <DialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-[#06b6d4]" />
                            Editar Limites: {profile.full_name || 'Usuário'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="meetings" className="text-right">Max Reuniões</Label>
                            <Input
                                id="meetings"
                                type="number"
                                value={limits.max_meetings}
                                onChange={(e) => setLimits({ ...limits, max_meetings: parseInt(e.target.value) })}
                                className="col-span-3 bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="participants" className="text-right">Max Partic.</Label>
                            <Input
                                id="participants"
                                type="number"
                                value={limits.max_participants}
                                onChange={(e) => setLimits({ ...limits, max_participants: parseInt(e.target.value) })}
                                className="col-span-3 bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="recording" className="text-right">Gravação</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Checkbox
                                    id="recording"
                                    checked={limits.can_record}
                                    onCheckedChange={(checked) => setLimits({ ...limits, can_record: checked as boolean })}
                                    className="border-white/30 data-[state=checked]:bg-[#06b6d4]"
                                />
                                <label htmlFor="recording" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Permitir Gravação
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveLimits} className="bg-[#06b6d4] hover:bg-[#0891b2]">
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Language Selection Modal (Interpreter) */}
            <Dialog open={openLang} onOpenChange={setOpenLang}>
                <DialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Languages className="h-5 w-5 text-[#06b6d4]" />
                            Definir Idiomas do Intérprete
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-gray-400">Selecione os idiomas que este usuário está habilitado a interpretar.</p>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-2">
                                {LANGUAGES.map((lang) => (
                                    <div key={lang.code} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                                        <Checkbox
                                            id={`lang-${lang.code}`}
                                            checked={selectedLangs.includes(lang.code)}
                                            onCheckedChange={() => handleLangToggle(lang.code)}
                                            className="border-white/30 data-[state=checked]:bg-[#06b6d4] data-[state=checked]:border-[#06b6d4]"
                                        />
                                        <label
                                            htmlFor={`lang-${lang.code}`}
                                            className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 w-full"
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            {lang.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={confirmInterpreterPromotion} className="bg-[#06b6d4] hover:bg-[#0891b2]">
                            Confirmar & Promover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10 transition-colors">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-gray-200">
                    <DropdownMenuLabel>Ações de Usuário</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(profile.id)}
                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                    >
                        Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setOpenPassword(true)}
                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer text-cyan-400"
                    >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Alterar Senha
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuLabel>Alterar Cargo</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => handleAction(() => updateUserRole(profile.id, 'user'))}
                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                    >
                        Tornar Usuário Padrão
                    </DropdownMenuItem>                    <DropdownMenuItem
                        onClick={handlePromoteToInterpreter}
                        className="text-blue-400 hover:bg-blue-400/10 focus:bg-blue-400/10 cursor-pointer"
                    >
                        Tornar Intérprete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleAction(() => updateUserRole(profile.id, 'admin'))}
                        className="text-orange-500 hover:bg-orange-500/10 focus:bg-orange-500/10 cursor-pointer"
                    >
                        Tornar Admin
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuLabel>Governança</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => setOpenLimits(true)}
                        className="text-[#06b6d4] hover:bg-[#06b6d4]/10 focus:bg-[#06b6d4]/10 cursor-pointer"
                    >
                        <Settings2 className="h-4 w-4 mr-2" />
                        Editar Limites
                    </DropdownMenuItem>
                    {profile.role === 'interpreter' && (
                        <DropdownMenuItem
                            onClick={() => setOpenLang(true)}
                            className="text-[#06b6d4] hover:bg-[#06b6d4]/10 focus:bg-[#06b6d4]/10 cursor-pointer"
                        >
                            <Languages className="h-4 w-4 mr-2" />
                            Editar Idiomas
                        </DropdownMenuItem>
                    )}
                    {status !== 'active' && (
                        <DropdownMenuItem
                            onClick={() => handleAction(() => updateUserStatus(profile.id, 'active'))}
                            className="text-green-500 hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
                        >
                            Ativar Usuário
                        </DropdownMenuItem>
                    )}
                    {status !== 'suspended' && (
                        <DropdownMenuItem
                            onClick={() => handleAction(() => updateUserStatus(profile.id, 'suspended'))}
                            className="text-yellow-500 hover:bg-yellow-500/10 focus:bg-yellow-500/10 cursor-pointer"
                        >
                            Suspender Usuário
                        </DropdownMenuItem>
                    )}
                    {status !== 'banned' && (
                        <DropdownMenuItem
                            onClick={() => handleAction(() => updateUserStatus(profile.id, 'banned'))}
                            className="text-red-500 font-bold hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
                        >
                            Banir Usuário
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                        onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) {
                                await handleAction(() => deleteUser(profile.id))
                            }
                        }}
                        className="text-red-600 font-extrabold hover:bg-red-600/10 focus:bg-red-600/10 cursor-pointer"
                    >
                        Excluir Usuário
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
