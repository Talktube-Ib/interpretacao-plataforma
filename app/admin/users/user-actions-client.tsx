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
import { MoreHorizontal, Settings2 } from 'lucide-react'
import React, { useState } from 'react'
import { updateUserRole, updateUserStatus, updateUserLimits } from '../actions'

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
}

export function UserActionsClient({ profile }: { profile: Profile }): React.ReactNode {
    const status = profile.status || 'active'
    const [open, setOpen] = useState(false)
    const [limits, setLimits] = useState({
        max_meetings: profile.limits?.max_meetings || 5,
        max_participants: profile.limits?.max_participants || 50,
        can_record: profile.limits?.can_record || false
    })

    const handleSaveLimits = async () => {
        try {
            await updateUserLimits(profile.id, limits)
            setOpen(false)
        } catch (error) {
            alert('Erro ao salvar limites')
        }
    }

    return (
        <div className="flex items-center gap-2">
            {/* Limits Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
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
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveLimits} className="bg-[#06b6d4] hover:bg-[#0891b2]">
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-white">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações de Usuário</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(profile.id)}>
                        Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuLabel>Alterar Cargo</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => updateUserRole(profile.id, 'participant')}>
                        Tornar Participante
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateUserRole(profile.id, 'host')}>
                        Tornar Host
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateUserRole(profile.id, 'interpreter')}>
                        Tornar Intérprete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateUserRole(profile.id, 'admin')} className="text-orange-500">
                        Tornar Admin
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel>Governança</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setOpen(true)} className="text-[#06b6d4]">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Editar Limites
                    </DropdownMenuItem>
                    {status !== 'active' && (
                        <DropdownMenuItem onClick={() => updateUserStatus(profile.id, 'active')} className="text-green-500">
                            Ativar Usuário
                        </DropdownMenuItem>
                    )}
                    {status !== 'suspended' && (
                        <DropdownMenuItem onClick={() => updateUserStatus(profile.id, 'suspended')} className="text-yellow-500">
                            Suspender Usuário
                        </DropdownMenuItem>
                    )}
                    {status !== 'banned' && (
                        <DropdownMenuItem onClick={() => updateUserStatus(profile.id, 'banned')} className="text-red-500 font-bold">
                            Banir Usuário
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
