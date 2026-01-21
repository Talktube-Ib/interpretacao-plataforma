'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SpeechRecognitionHook {
    isListening: boolean
    transcript: string
    interimTranscript: string
    startListening: () => void
    stopListening: () => void
    resetTranscript: () => void
    error: string | null
    isSupported: boolean
}

export function useSpeechRecognition(language: string = 'pt-BR'): SpeechRecognitionHook {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSupported, setIsSupported] = useState(false)

    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            setIsSupported(true)
            const SpeechRecognition = (window as any).webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = language

            recognitionRef.current.onstart = () => setIsListening(true)
            recognitionRef.current.onend = () => {
                // Auto-restart if it stopped but we didn't ask it to (handling network hiccups or silence timeouts)
                // BUT: infinite loops are dangerous. Simple version first.
                setIsListening(false)
            }
            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error)
                setError(event.error)
                setIsListening(false)
            }

            recognitionRef.current.onresult = (event: any) => {
                let finalTrans = ''
                let interimTrans = ''

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTrans += event.results[i][0].transcript
                    } else {
                        interimTrans += event.results[i][0].transcript
                    }
                }

                if (finalTrans) {
                    setTranscript(prev => {
                        const newVal = prev + ' ' + finalTrans
                        // Keep buffer manageable
                        return newVal.slice(-50000)
                    })
                }
                setInterimTranscript(interimTrans)
            }
        } else {
            setError("Web Speech API not supported in this browser.")
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop() } catch (e) { }
            }
        }
    }, [language])

    const startListening = useCallback(() => {
        setError(null)
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start()
            } catch (e) {
                console.warn("Speech recognition already started or failed to start", e)
            }
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }, [])

    const resetTranscript = useCallback(() => setTranscript(''), [])

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        error,
        isSupported
    }
}
