import { NextResponse } from 'next/server'

export async function GET() {
    const envKeys = Object.keys(process.env)
    const livekitKeys = envKeys.filter(k => k.includes('LIVEKIT'))

    return NextResponse.json({
        message: "Diagnostic Environment Check",
        relevantKeysDetected: livekitKeys,
        keyDetails: livekitKeys.map(k => ({
            name: k,
            length: process.env[k]?.length || 0,
            exists: !!process.env[k]
        })),
        hints: [
            "Ensure names match EXACTLY: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL",
            "Next.js server-side routes can read both prefixed and non-prefixed variables.",
            "If changes were made in dashboard, a REDEPLOY is required."
        ]
    })
}
