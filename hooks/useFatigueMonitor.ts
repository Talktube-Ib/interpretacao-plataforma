'use client'

import { useState, useEffect, useRef } from 'react'

const WARNING_THRESHOLD = 20 * 60 // 20 minutes in seconds
const CRITICAL_THRESHOLD = 30 * 60 // 30 minutes in seconds

export function useFatigueMonitor(isActive: boolean) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1)
            }, 1000)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isActive])

    const resetTimer = () => setElapsedSeconds(0)

    const status = elapsedSeconds >= CRITICAL_THRESHOLD ? 'critical'
        : elapsedSeconds >= WARNING_THRESHOLD ? 'warning'
            : 'normal'

    return {
        elapsedSeconds,
        status,
        resetTimer
    }
}
