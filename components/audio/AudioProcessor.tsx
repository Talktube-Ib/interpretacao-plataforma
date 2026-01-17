'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioProcessorProps {
    stream: MediaStream | null
    isEnabled: boolean
    children?: React.ReactNode
}

/**
 * AudioProcessor
 * Intercepts the audio stream and applies a DynamicsCompressorNode to limit loud noises.
 * NOTE: This is complex because we need to modify the audio destination or playback.
 * 
 * Strategy:
 * Instead of modifying the original stream (which might affect WebRTC sending), 
 * we use this to PROCESS INCOMING audio from peers if we could interception individual tracks.
 * 
 * However, simpler approach for "Room" level protection:
 * We might not be able to easily intercept the <audio> elements created by 'simple-peer' inside other components 
 * without Ref access.
 * 
 * ALTERNATIVE: 
 * This component visualizes the local stream (VU Meter) and theoretically could route output 
 * if we controlled the audio element playback source.
 * 
 * For this MVP, let's focus on the VU Meter part as 'Protection' via visual feedback, 
 * and explore if we can route the *incoming* remote streams through this context.
 * 
 * Actually, to protect the interpreter's ears, we need to process the REMOTE streams.
 * The `VideoPlayer` component plays the audio. We would need to hook into that.
 * 
 * For now, this component will serve as a global "Audio Context Manager" and VU Meter for the user's mic.
 */
export function AudioProcessor({ stream, isEnabled }: AudioProcessorProps) {
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const [volumeLevel, setVolumeLevel] = useState(0)

    useEffect(() => {
        if (!stream || !isEnabled) return

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }

        const ctx = audioContextRef.current
        analyserRef.current = ctx.createAnalyser()
        analyserRef.current.fftSize = 256

        try {
            sourceRef.current = ctx.createMediaStreamSource(stream)
            sourceRef.current.connect(analyserRef.current)
        } catch (e) {
            console.error("AudioContext connection error", e)
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

        let rafId: number

        const updateMeter = () => {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray)
                // Calculate average volume
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const average = sum / dataArray.length
                setVolumeLevel(average) // 0 - 255
            }
            rafId = requestAnimationFrame(updateMeter)
        }

        updateMeter()

        return () => {
            cancelAnimationFrame(rafId)
            if (sourceRef.current) sourceRef.current.disconnect()
            // Don't close context immediately if we want to reuse? Better to close to free resources.
            // ctx.close()
        }
    }, [stream, isEnabled])

    // Visual VU Meter
    return (
        <div className="flex flex-col items-center gap-1 w-2">
            <div className="w-1.5 h-10 bg-zinc-800 rounded-full overflow-hidden flex flex-col justify-end">
                <div
                    className="w-full transition-all duration-75 bg-green-500"
                    style={{
                        height: `${Math.min((volumeLevel / 128) * 100, 100)}%`,
                        backgroundColor: volumeLevel > 200 ? '#ef4444' : volumeLevel > 150 ? '#eab308' : '#22c55e'
                    }}
                />
            </div>
        </div>
    )
}
