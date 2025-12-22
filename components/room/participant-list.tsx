'use client'

import { Users, User as UserIcon, Mic, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Peer {
    userId: string
    role: string
}

export function ParticipantList({
    peers,
    userRole,
    userCount,
    isHost,
    hostId,
    onPromote,
    onClose
}: {
    peers: any[],
    userRole: string,
    userCount: number,
    isHost: boolean,
    hostId: string | null,
    onPromote: (id: string) => void,
    onClose?: () => void
}) {
    return (
        <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl border-l border-border w-full md:w-80 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#06b6d4]" />
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Participantes</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-accent/50 px-2 py-0.5 rounded text-[10px] font-black text-[#06b6d4] border border-border">
                        {userCount}
                    </span>
                    {onClose && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden text-muted-foreground" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Me */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-accent/20 border border-[#06b6d4]/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#06b6d4]/20 flex items-center justify-center border border-[#06b6d4]/40">
                            <UserIcon className="h-4 w-4 text-[#06b6d4]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">Você</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-black">{userRole}</span>
                                {isHost && (
                                    <span className="bg-[#06b6d4]/20 text-[#06b6d4] text-[8px] px-1.5 py-0.5 rounded-full font-black border border-[#06b6d4]/30 uppercase tracking-tighter shadow-sm">
                                        Host
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {(userRole === 'interpreter' || userRole === 'admin') && <Mic className="h-3 w-3 text-purple-400" />}
                </div>

                {/* Others */}
                {peers.map((peer) => (
                    <div key={peer.userId} className="flex items-center justify-between p-3 rounded-2xl bg-accent/50 border border-border hover:border-[#06b6d4]/30 transition-colors">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground truncate">{peer.name || peer.userId.split('-')[1] || peer.userId}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase font-black">{peer.role}</span>
                                    {peer.userId === hostId && (
                                        <span className="bg-[#06b6d4]/20 text-[#06b6d4] text-[8px] px-1.5 py-0.5 rounded-full font-black border border-[#06b6d4]/30 uppercase tracking-tighter">
                                            Host
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {(peer.role === 'interpreter' || peer.role === 'admin') && <Mic className="h-3 w-3 text-purple-400" />}
                            {isHost && peer.userId !== hostId && !peer.isPresentation && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onPromote(peer.userId)}
                                    className="h-7 text-[9px] font-black uppercase px-2 rounded-lg border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4] hover:text-white transition-all shadow-sm active:scale-95"
                                >
                                    Tornar Host
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {peers.length === 0 && (
                    <div className="py-20 text-center text-gray-600">
                        <p className="text-xs italic">Ninguém mais na sala.</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
                <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">
                    A arquitetura P2P garante que sua conexão seja direta e privada.
                </p>
            </div>
        </div>
    )
}
