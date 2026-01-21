'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
interface UseMeetingTranscriptionProps {
    meetingId: string
    userId: string
    userName: string
    isMicOn: boolean
    language?: string
    enabled?: boolean
    transcript: string // New prop (Shared source)
}

export function useMeetingTranscription({ meetingId, userId, userName, isMicOn, language = 'pt-BR', enabled = false, transcript }: UseMeetingTranscriptionProps) {
    // Removed internal useSpeechRecognition to avoid conflicts

    const lastProcessedRef = useRef('')

    // Note: Start/Stop listening is now handled by the parent (RoomPage)


    // Monitor transcript changes and upload FINAL results
    // Limitation of Web Speech API: It streams results. We need to detect "final" or pauses.
    // The simple hook provided earlier (useSpeechRecognition) might overwrite 'transcript' constantly.
    // To properly capture segments, we need the hook to emit 'onFinal' event or we check changes.

    // As the previous hook implementation (viewed earlier) just exposes 'transcript' state which accumulates or resets:
    // Let's modify logic: We will assume the component utilizing this hook handles the "Stream".
    // ACTUALLY, to avoid modifying the base hook too much, let's just listen to transcript.
    // Ideally, we'd want 'final' results.

    // For this MVP, let's treat the 'transcript' accumulation. 
    // If transcript grows, good. If it resets, we assume previous part was final.
    // BUT useSpeechRecognition (Standard) accumulates until stop.

    // BETTER APPROACH for "Minutes":
    // We upload chunks periodically or when user stops talking (Debounce).

    useEffect(() => {
        if (!transcript) return

        const timeout = setTimeout(async () => {
            // Check for Reset/Truncation
            if (transcript.length < lastProcessedRef.current.length) {
                lastProcessedRef.current = '' // Reset pointer if transcript was cleared/truncated
            }

            // Debounce: User stopped talking for 2 seconds? Or sentence finished?
            // Problem: If user speaks for 1 hour, transcript is huge.
            // We need to cut it.

            // Let's implement a "Chunking" based on length difference for now
            const newContent = transcript.slice(lastProcessedRef.current.length).trim()

            if (newContent.length > 10 && enabled) { // Only upload substantial chunks if enabled
                // Upload
                const supabase = createClient()
                await supabase.from('meeting_transcripts').insert({
                    meeting_id: meetingId,
                    user_id: userId,
                    user_name: userName,
                    content: newContent,
                    language: language
                })

                // Update marker
                lastProcessedRef.current = transcript
            }
        }, 3000)

        return () => clearTimeout(timeout)
    }, [transcript, meetingId, userId, userName, enabled, language])

    return {
        // isListening is now managed externally
        currentTranscript: transcript
    }
}
