"use client"

import React, { useEffect, useState } from 'react'
import { cn } from "@/lib/utils"

interface AudioMeterProps {
    stream: MediaStream | null
    className?: string
    barCount?: number
}

export function AudioMeter({ stream, className, barCount = 20 }: AudioMeterProps) {
    const [level, setLevel] = useState(0)

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setLevel(0)
            return
        }

        let audioCtx: AudioContext | null = null
        let analyser: AnalyserNode | null = null
        let source: MediaStreamAudioSourceNode | null = null
        let animationId: number

        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            analyser = audioCtx.createAnalyser()
            source = audioCtx.createMediaStreamSource(stream)
            source.connect(analyser)

            analyser.fftSize = 64
            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            const update = () => {
                if (!analyser) return
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i]
                }
                const average = sum / bufferLength
                // Normalize and scale for visibility
                const normalized = Math.min(100, (average / 128) * 100)
                setLevel(normalized)
                animationId = requestAnimationFrame(update)
            }
            update()
        } catch (err) {
            console.error("AudioMeter error:", err)
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
            if (audioCtx) audioCtx.close()
        }
    }, [stream])

    return (
        <div className={cn("flex items-center gap-[2px] w-full h-2 bg-muted/20 rounded-full overflow-hidden", className)}>
            <div
                className="h-full bg-primary transition-all duration-75 ease-out shadow-[0_0_10px_#06b6d4]"
                style={{ width: `${level}%` }}
            />
        </div>
    )
}
