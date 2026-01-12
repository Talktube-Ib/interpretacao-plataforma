'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, User, Shield, Video, Mic, MoreVertical, Wifi, Volume2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

interface Peer {
    userId: string
    name: string
    role: string
    micOn: boolean
    cameraOn: boolean
    handRaised?: boolean
    language?: string // Broadcast language
    isHost?: boolean
    audioBlocked?: boolean
}

interface ParticipantListProps {
    peers: Peer[]
    userRole: string
    userCount: number
    isHost: boolean
    hostId: string
    onPromote?: (userId: string) => void
    onKick?: (userId: string) => void
    onUpdateRole?: (userId: string, role: string) => void

    onUpdateLanguages?: (userId: string, languages: string[]) => void
    onMute?: (userId: string) => void
    onBlockAudio?: (userId: string) => void
    onUnblockAudio?: (userId: string) => void

    localMutedPeers?: Set<string>
    onToggleLocalMute?: (userId: string) => void

    onClose: () => void
}


export function ParticipantList({
    peers,
    userRole,
    userCount,
    isHost,
    hostId,
    onPromote,
    onKick,
    onUpdateRole,

    onMute,
    onBlockAudio,
    onUnblockAudio,
    localMutedPeers,
    onToggleLocalMute,
    onClose
}: ParticipantListProps) {


    // Sort: Host first, then interpreters, then participants. Alphabetical within groups.
    const sortedPeers = [...peers].sort((a, b) => {
        // Current user (assuming they are in peers? usually peers excludes self in some impls, 
        // but let's assume this list might include logic for "ME" if handled by parent. 
        // If "peers" only has remotes, we need "ME" passed in. 
        // Note: The RoomPage passes 'peers' which is useWebRTC's peers. Usually separate.
        // Let's rely on what we have.

        const roleScore = (p: Peer) => {
            if (p.userId === hostId) return 3
            if (p.role === 'interpreter') return 2
            return 1
        }
        return roleScore(b) - roleScore(a)
    })

    return (
        <div className="flex flex-col h-full bg-slate-950 border-l border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-lg tracking-tight">Participantes</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-bold text-slate-400 border border-white/5">
                        {userCount}
                    </span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {sortedPeers.map(peer => {
                        const isInterpreter = peer.role?.includes('interpreter')
                        const isPeerHost = peer.userId === hostId

                        return (
                            <div key={peer.userId} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        {isPeerHost && (
                                            <div className="absolute -bottom-1 -right-1 bg-yellow-500/20 text-yellow-500 p-0.5 rounded-full border border-yellow-500/50" title="Host">
                                                <Shield className="h-3 w-3 fill-current" />
                                            </div>
                                        )}
                                        {isInterpreter && !isPeerHost && (
                                            <div className="absolute -bottom-1 -right-1 bg-purple-500/20 text-purple-400 p-0.5 rounded-full border border-purple-500/50" title="Intérprete">
                                                <Wifi className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-200 truncate max-w-[120px]">
                                                {peer.name || 'Usuário'}
                                            </span>
                                            {/* Status Icons */}
                                            <div className="flex items-center gap-1 opacity-50">
                                                {!peer.micOn && <Mic className="h-3 w-3 text-red-400" />}
                                                {peer.audioBlocked && <Mic className="h-3 w-3 text-red-600 animate-pulse" />}
                                                {!peer.cameraOn && <Video className="h-3 w-3 text-red-400" />}
                                                {localMutedPeers?.has(peer.userId) && <Volume2 className="h-3 w-3 text-amber-500" />}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                            {isPeerHost ? 'Anfitrião' : isInterpreter ? 'Intérprete' : 'Participante'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Menu */}
                                {((isHost && peer.userId !== hostId) || onToggleLocalMute) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-slate-800" />

                                            {/* Local Mute (For everyone) */}
                                            {onToggleLocalMute && peer.userId !== hostId && ( // Can't local mute host? Maybe yes? Let's allow.
                                                <DropdownMenuItem onClick={() => onToggleLocalMute(peer.userId)} className="cursor-pointer hover:bg-slate-800">
                                                    {localMutedPeers?.has(peer.userId) ? (
                                                        <>
                                                            <Volume2 className="h-4 w-4 mr-2" />
                                                            Ouvir (Para mim)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Volume2 className="h-4 w-4 mr-2 text-zinc-400" />
                                                            Mutar (Para mim)
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            )}

                                            {isHost && peer.userId !== hostId && (
                                                <>
                                                    <DropdownMenuSeparator className="bg-slate-800" />

                                                    {onPromote && (
                                                        <DropdownMenuItem onClick={() => onPromote(peer.userId)} className="cursor-pointer hover:bg-slate-800">
                                                            <Shield className="h-4 w-4 mr-2 text-yellow-500" />
                                                            Promover a Host
                                                        </DropdownMenuItem>
                                                    )}

                                                    {onUpdateRole && !isInterpreter && (
                                                        <DropdownMenuItem onClick={() => onUpdateRole(peer.userId, 'interpreter')} className="cursor-pointer hover:bg-slate-800">
                                                            <Wifi className="h-4 w-4 mr-2 text-purple-500" />
                                                            Tornar Intérprete
                                                        </DropdownMenuItem>
                                                    )}

                                                    {onUpdateRole && isInterpreter && (
                                                        <DropdownMenuItem onClick={() => onUpdateRole(peer.userId, 'participant')} className="cursor-pointer hover:bg-slate-800">
                                                            <User className="h-4 w-4 mr-2 text-blue-500" />
                                                            Remover Intérprete
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator className="bg-slate-800" />

                                                    {onMute && peer.micOn && (
                                                        <DropdownMenuItem onClick={() => onMute(peer.userId)} className="cursor-pointer hover:bg-slate-800 text-red-400">
                                                            <Mic className="h-4 w-4 mr-2" />
                                                            Desativar Microfone
                                                        </DropdownMenuItem>
                                                    )}

                                                    {onBlockAudio && onUnblockAudio && (
                                                        <DropdownMenuItem
                                                            onClick={() => peer.audioBlocked ? onUnblockAudio(peer.userId) : onBlockAudio(peer.userId)}
                                                            className="cursor-pointer hover:bg-slate-800 text-amber-500"
                                                        >
                                                            {peer.audioBlocked ? (
                                                                <>
                                                                    <Mic className="h-4 w-4 mr-2" />
                                                                    Desbloquear Áudio
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Mic className="h-4 w-4 mr-2" />
                                                                    Bloquear Áudio
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator className="bg-slate-800" />


                                                    {onKick && (
                                                        <DropdownMenuItem onClick={() => onKick(peer.userId)} className="text-red-400 cursor-pointer hover:bg-red-900/20 focus:text-red-400">
                                                            Remover da Sala
                                                        </DropdownMenuItem>
                                                    )}

                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
