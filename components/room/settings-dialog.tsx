"use client"

import React from 'react'
import { Settings, Mic, Video, Volume2, Globe, Shield, User } from 'lucide-react'
import { AudioMeter } from './audio-meter'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
    audioDevices: MediaDeviceInfo[]
    videoDevices: MediaDeviceInfo[]
    currentAudioId?: string
    currentVideoId?: string
    onSwitch: (kind: 'audio' | 'video', deviceId: string) => void
    trigger?: React.ReactNode
    localStream?: MediaStream | null
}

export function SettingsDialog({
    audioDevices,
    videoDevices,
    currentAudioId,
    currentVideoId,
    onSwitch,
    trigger,
    localStream
}: SettingsDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-accent/50 text-muted-foreground transition-all active:scale-95">
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/50 rounded-[2.5rem] shadow-3xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        Configurações
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Microfone */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            <Mic className="h-3 w-3" /> Entrada de Áudio
                        </Label>
                        <Select value={currentAudioId} onValueChange={(val) => onSwitch('audio', val)}>
                            <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/50 focus:ring-primary/20">
                                <SelectValue placeholder="Selecione o Microfone" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl">
                                {audioDevices.map((d) => (
                                    <SelectItem key={d.deviceId} value={d.deviceId} className="rounded-xl">
                                        {d.label || `Microfone ${d.deviceId.slice(0, 5)}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Câmera */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            <Video className="h-3 w-3" /> Entrada de Vídeo
                        </Label>
                        <Select value={currentVideoId} onValueChange={(val) => onSwitch('video', val)}>
                            <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/50 focus:ring-primary/20">
                                <SelectValue placeholder="Selecione a Câmera" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl">
                                {videoDevices.map((d) => (
                                    <SelectItem key={d.deviceId} value={d.deviceId} className="rounded-xl">
                                        {d.label || `Câmera ${d.deviceId.slice(0, 5)}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Teste de Nível de Áudio */}
                    <div className="pt-4 space-y-3">
                        <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            <Volume2 className="h-3 w-3" /> Nível do Microfone
                        </Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 bg-accent/20 rounded-2xl h-12 flex items-center px-4 gap-3 border border-border/30">
                                <AudioMeter stream={localStream || null} />
                            </div>
                            <Button variant="outline" className="rounded-2xl h-12 border-border/50 font-bold px-6 hover:bg-accent/50">
                                Testar
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
                        <div className="p-3 rounded-2xl bg-accent/10 border border-border/30 flex items-center gap-3">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Criptografia Ponta-a-Ponta Ativada</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
