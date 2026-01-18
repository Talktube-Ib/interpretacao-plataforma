'use client'

import { Mic, Square, Download, Ghost } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRecorder } from '@/hooks/useRecorder'

interface RecorderControlsProps {
    stream: MediaStream | null
    isShadowing: boolean
    onToggleShadowing: () => void
}

export function RecorderControls({ stream, isShadowing, onToggleShadowing }: RecorderControlsProps) {
    const { isRecording, recordingTime, audioUrl, startRecording, stopRecording, formatTime } = useRecorder(stream)

    return (
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
            {/* Shadowing Toggle */}
            <Button
                variant={isShadowing ? "destructive" : "ghost"}
                size="sm"
                onClick={onToggleShadowing}
                className={cn(
                    "h-8 px-3 text-xs font-bold transition-all relative overflow-hidden",
                    isShadowing ? "bg-purple-900/50 text-purple-200 border border-purple-500/50 animate-pulse" : "text-zinc-400 hover:text-white"
                )}
                title="Modo Shadowing (Prática sem transmitir ao vivo)"
            >
                <Ghost className="h-3.5 w-3.5 mr-2" />
                {isShadowing ? "SHADOWING ON" : "SHADOW"}
            </Button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* Recording Controls */}
            {!isRecording ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-full"
                    onClick={startRecording}
                    disabled={!stream}
                    title="Gravar Performance"
                >
                    <div className="h-3 w-3 rounded-full bg-current" />
                </Button>
            ) : (
                <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-mono text-red-400 animate-pulse">
                        REC {formatTime(recordingTime)}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={stopRecording}
                    >
                        <Square className="h-3 w-3 fill-current" />
                    </Button>
                </div>
            )}

            {/* Download Link */}
            {audioUrl && !isRecording && (
                <a
                    href={audioUrl}
                    download={`interpretaçao-${new Date().toISOString().slice(0, 16)}.webm`}
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                >
                    <Download className="h-3.5 w-3.5" />
                </a>
            )}
        </div>
    )
}
