"use client"

import { useEffect } from 'react'

export function WebRTCPolyfills() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const win = window as unknown as Record<string, unknown>
            if (!win.global) win.global = win
            if (!win.process) win.process = { env: { DEBUG: undefined }, nextTick: (cb: () => void) => setTimeout(cb, 0) }
        }
    }, [])

    return null
}
