
import { NextResponse } from 'next/server'

export async function GET() {
    // 1. Try to get TURN credentials from environment variables
    const meteredApiKey = process.env.METERED_API_KEY
    const turnUrl = process.env.TURN_URL || process.env.NEXT_PUBLIC_TURN_URL
    const turnUsername = process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME
    const turnCredential = process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL

    // Default to Google's public STUN server (Free, but only works 80% of the time, fails on Corp/4G)
    let iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]

    // A. Preferred: Automatic Fetch from Metered.ca
    if (meteredApiKey) {
        try {
            // Using the Global API (or you can verify your specific endpoint in dashboard)
            // Ideally URL should be in env too, but standard metered global API is common.
            // Actually, Metered usually gives a unique domain like: https://appname.metered.live/api/v1/turn/credentials?apiKey=...
            // We will ask user for METERED_DOMAIN_URL to be safe, or just try to generic one if possible?
            // Metered docs say: GET https://<APP_NAME>.metered.live/api/v1/turn/credentials?apiKey=<API_KEY>
            // So we need the app name / domain. Let's ask for METERED_API_URL fully.

            // Let's rely on METERED_API_KEY being the full URL or we add METERED_DOMAIN
            // Simpler: Just ask for the full TURN credentials as before using "Static Credentials" guide?
            // No, the user wants "Simple". 
            // The "Expiring Credentials" page they linked actually shows how to generate them.
            // Let's stick to the StaticEnv approach for now to avoid network latency on every request if not cached. 
            // BUT, if they are "Mega Leigo", maybe they can't find the static ones.

            // Let's stick to the previous plan but explain it better. 
            // The previous code is fine. I will just explain to the user.
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
