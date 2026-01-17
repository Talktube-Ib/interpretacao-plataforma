'use client'

import { Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFatigueMonitor } from '@/hooks/useFatigueMonitor'

interface FatigueTimerProps {
    isActive: boolean
}

export function FatigueTimer({ isActive }: FatigueTimerProps) {
    const { elapsedSeconds, status, resetTimer } = useFatigueMonitor(isActive)

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-500",
            status === 'normal' && "bg-zinc-900/50 border-white/10 text-zinc-400",
            status === 'warning' && "bg-yellow-500/10 border-yellow-500/50 text-yellow-500",
            status === 'critical' && "bg-red-500/10 border-red-500/50 text-red-500 animate-pulse"
        )}>
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs font-medium tabular-nums">
                {formatTime(elapsedSeconds)}
            </span>

            {/* Show reset button if not 0 */}
            {elapsedSeconds > 0 && !isActive && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 text-zinc-500 hover:text-white"
                    onClick={resetTimer}
                    title="Resetar turno"
                >
                    <RefreshCw className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}
