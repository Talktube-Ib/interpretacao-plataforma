import { NextResponse } from 'next/server'

// FIX: Open Relay removido como fallback.
// O Open Relay (openrelayproject) é gratuito, compartilhado e frequentemente sobrecarregado.
// Em redes corporativas (firewalls), o vídeo era roteado por ele e travava por falta de banda.
//
// SOLUÇÃO RECOMENDADA (escolha uma):
// 1. Livekit Cloud tem TURN integrado — se você usa LiveKit Cloud, não precisa de TURN separado.
//    Basta não passar iceServers para o Room e o LiveKit resolve automaticamente.
//
// 2. Se precisar de TURN próprio, use a Metered (paga) com METERED_API_KEY configurado.
//
// 3. LiveKit self-hosted inclui TURN nativo (porta 443 UDP/TCP) — zero config adicional.

export async function GET() {
    const meteredApiKey = process.env.METERED_API_KEY

    // STUN público do Google — leve, sem banda, só para descoberta de IP
    const stunServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]

    // Se tem Metered configurado, usa os servidores pagos (globais, low-latency)
    if (meteredApiKey) {
        try {
            const domain = process.env.METERED_DOMAIN || 'global.metered.live'
            const response = await fetch(
                `https://${domain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
                { next: { revalidate: 3600 } }  // cache por 1h — as credenciais duram horas
            )
            if (response.ok) {
                const meteredServers = await response.json()
                // Metered primeiro (TURN pago), STUN Google como backup leve
                return NextResponse.json({ iceServers: [...meteredServers, ...stunServers] })
            }
        } catch (e) {
            console.error('[TURN] Metered fetch failed:', e)
        }
    }

    // Fallback: só STUN.
    // Se o LiveKit Cloud está sendo usado, ele injeta TURN automaticamente via token.
    // Se usuários em firewalls severos não conseguem conectar sem TURN, configure METERED_API_KEY.
    console.warn('[TURN] Retornando apenas STUN — configure METERED_API_KEY para suporte a firewalls corporativos.')
    return NextResponse.json({ iceServers: stunServers })
}
