
import { NextResponse } from 'next/server'

export async function GET() {
    // 1. Try to get TURN credentials from environment variables
    const meteredApiKey = process.env.METERED_API_KEY
    const turnUrl = process.env.TURN_URL || process.env.NEXT_PUBLIC_TURN_URL
    const turnUsername = process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME
    const turnCredential = process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL

    // Default to a robust list of public STUN servers and Open Relay (Community TURN)
    const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Open Relay Project (Free TURN) - Excellent for MVPs
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]

    // A. Preferred: Automatic Fetch from Metered.ca
    if (meteredApiKey) {
        try {
            const domain = process.env.METERED_DOMAIN || 'global.metered.live'
            const url = `https://${domain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`

            const response = await fetch(url)
            if (response.ok) {
                const iceServersFromMetered = await response.json()
                // Metered returns an array of ICE servers directly or wrapped? 
                // Usually returns: [ { urls: "...", username: "...", credential: "..." } ]
                // We verify if it's an array.
                if (Array.isArray(iceServersFromMetered)) {
                    return NextResponse.json({ iceServers: iceServersFromMetered })
                }
            } else {
                console.error("Metered API returned error:", response.status, await response.text())
            }
        } catch (e) {
            console.error("Metered fetch failed", e)
        }
    }

    // B. Manual Config (if TURN is configured manually)
    if (turnUrl && turnUsername && turnCredential) {
        iceServers.unshift({
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential
        })
    }

    return NextResponse.json({ iceServers })
}
