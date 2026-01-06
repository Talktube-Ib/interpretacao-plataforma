'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Volume1 } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { cn } from '@/lib/utils'

interface VolumeControlProps {
    volume: number // 0 to 1
    onVolumeChange: (value: number) => void
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
    const [prevVolume, setPrevVolume] = useState(1)

    // Fishbone Bars (5 levels)
    // 1: >0, 2: >0.2, 3: >0.4, 4: >0.6, 5: >0.8
    const bars = [1, 2, 3, 4, 5]

    const toggleMute = () => {
        if (volume > 0) {
            setPrevVolume(volume)
            onVolumeChange(0)
        } else {
            onVolumeChange(prevVolume > 0 ? prevVolume : 1)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl group hover:bg-white/10"
                    title="Volume Geral"
                >
                    {/* Custom Fishbone Icon - Minimalist */}
                    <div className="relative flex items-end gap-[3px] h-5 w-5 md:h-6 md:w-6 justify-center">
                        {volume === 0 && (
                            <VolumeX className="text-zinc-500 absolute inset-0 m-auto h-4 w-4" />
                        )}

                        {volume > 0 && bars.map((bar) => {
                            const isActive = volume >= (bar * 0.2 - 0.1)
                            const heightClass = [
                                "h-[20%]", "h-[40%]", "h-[60%]", "h-[80%]", "h-[100%]"
                            ][bar - 1]

                            return (
                                <div
                                    key={bar}
                                    className={cn(
                                        "w-[2px] rounded-full transition-all duration-300",
                                        heightClass,
                                        isActive ? "bg-white" : "bg-white/10"
                                    )}
                                />
                            )
                        })}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-12 h-48 bg-black/90 backdrop-blur-3xl border-white/10 p-0 flex flex-col items-center justify-center rounded-2xl shadow-2xl z-[60] mb-4">
                <div className="h-32 py-4">
                    <Slider
                        orientation="vertical"
                        value={[volume * 100]}
                        onValueChange={(vals) => onVolumeChange(vals[0] / 100)}
                        max={100}
                        step={1}
                        className="h-full w-2"
                    />
                </div>
                <div className="pb-4 text-[10px] font-bold text-zinc-400">
                    {Math.round(volume * 100)}%
                </div>
            </PopoverContent>
        </Popover>
    )
}
