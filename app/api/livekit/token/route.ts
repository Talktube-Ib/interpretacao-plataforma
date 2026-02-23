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

    if (!apiKey || !apiSecret || !wsUrl) {
        console.error('LIVEKIT CONFIG ERROR:', {
            hasApiKey: !!apiKey,
            apiKeyStart: apiKey?.substring(0, 4),
            hasApiSecret: !!apiSecret,
            hasWsUrl: !!wsUrl
        })
        return NextResponse.json({
            error: 'Server misconfigured',
            details: `Missing: ${[!apiKey && 'API_KEY', !apiSecret && 'API_SECRET', !wsUrl && 'WS_URL'].filter(Boolean).join(', ')}`
        }, { status: 500 })
    }

    try {
        console.log('Generating token for:', { room, username })
        const at = new AccessToken(apiKey, apiSecret, { identity: username })

        at.addGrant({ roomJoin: true, room: room })

        const token = await at.toJwt()
        return NextResponse.json({ token })
    } catch (error) {
        console.error('Error generating LiveKit token:', error)
        return NextResponse.json({ error: 'Failed to generate token', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
