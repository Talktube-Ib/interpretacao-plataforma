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

        const uploadContent = async (text: string, fullTranscriptSnapshot: string) => {
            const supabase = createClient()
            const { error } = await supabase.from('meeting_transcripts').insert({
                meeting_id: meetingId,
                user_id: userId,
                user_name: userName,
                content: text,
                language: language
            })

            if (error) {
                console.error("Transcription Upload Error:", error)
            } else {
                console.log("Transcription Uploaded:", text.substring(0, 20) + "...")
            }
        }

        // Check for Reset/Truncation
        if (transcript.length < lastProcessedRef.current.length) {
            lastProcessedRef.current = ''
        }

        const pendingContent = transcript.slice(lastProcessedRef.current.length).trim()

        // Rule 1: Immediate Upload (Burst) - If > 100 chars (~1 sentence), upload NOW.
        if (pendingContent.length > 100 && enabled) {
            // Snapshot the current state to lock what we are uploading
            const contentToUpload = pendingContent
            const currentReqLength = transcript.length

            // Advance ref immediately to prevent double-triggering in next render
            // (Since 'transcript' might update 10ms later with 101 chars)
            lastProcessedRef.current = transcript

            uploadContent(contentToUpload, transcript)
            return // Skip debounce
        }

        // Rule 2: Debounce (Silence) - If user pauses for 3s, upload whatever is small.
        const timeout = setTimeout(async () => {
            const finalPending = transcript.slice(lastProcessedRef.current.length).trim()
            if (finalPending.length > 5 && enabled) {
                lastProcessedRef.current = transcript
                await uploadContent(finalPending, transcript)
            }
        }, 3000)

        return () => clearTimeout(timeout)
    }, [transcript, meetingId, userId, userName, enabled, language])

    return {
        // isListening is now managed externally
        currentTranscript: transcript
    }
}
