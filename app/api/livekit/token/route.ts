import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get('room')
    const username = req.nextUrl.searchParams.get('username')

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 })
    } else if (!username) {
        return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    // Diagnostic logs (safe, only lengths)
    console.log('Generating LiveKit token - Meta:', {
        apiKeyLength: apiKey?.length,
        apiSecretLength: apiSecret?.length,
        hasWsUrl: !!wsUrl,
        room,
        username
    })

    if (!apiKey || !apiSecret || !wsUrl) {
        console.error('LIVEKIT CONFIG ERROR: Missing environment variables')
        return NextResponse.json({
            error: 'Server misconfigured',
            details: `Missing: ${[!apiKey && 'API_KEY', !apiSecret && 'API_SECRET', !wsUrl && 'WS_URL'].filter(Boolean).join(', ')}`,
            config: {
                apiKeyLength: apiKey?.length || 0,
                apiSecretLength: apiSecret?.length || 0,
                hasWsUrl: !!wsUrl
            }
        }, { status: 500 })
    }

    try {
        const at = new AccessToken(apiKey, apiSecret, { identity: username })
        at.addGrant({ roomJoin: true, room: room })
        const token = await at.toJwt()
        return NextResponse.json({
            token,
            serverInfo: {
                apiKeyLength: apiKey.length,
                apiSecretLength: apiSecret.length
            }
        })
    } catch (error) {
        console.error('Error generating LiveKit token:', error)
        return NextResponse.json({
            error: 'Failed to generate token',
            details: error instanceof Error ? error.message : String(error),
            apiKeyLength: apiKey?.length || 0,
            apiSecretLength: apiSecret?.length || 0
        }, { status: 500 })
    }
}
