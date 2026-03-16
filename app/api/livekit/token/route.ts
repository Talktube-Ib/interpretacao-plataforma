import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

// Tipos de cargo suportados
type ParticipantRole = 'admin' | 'interpreter' | 'participant' | 'guest'

// Permissões por cargo
const ROLE_GRANTS: Record<ParticipantRole, any> = {
  admin: {
    roomJoin: true,
    roomCreate: true,
    roomAdmin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  },
  interpreter: {
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  },
  participant: {
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canUpdateOwnMetadata: false,
  },
  guest: {
    roomJoin: true,
    canPublish: false,   // Convidado só assiste
    canSubscribe: true,
    canPublishData: false,
    canUpdateOwnMetadata: false,
  },
}

// TTL por cargo (em segundos)
const ROLE_TTL: Record<ParticipantRole, number> = {
  admin:       60 * 60 * 8,  // 8 horas
  interpreter: 60 * 60 * 6,  // 6 horas (sessões longas de interpretação)
  participant: 60 * 60 * 4,  // 4 horas
  guest:       60 * 60 * 2,  // 2 horas
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const room     = searchParams.get('room')
  const username = searchParams.get('username')
  const role     = (searchParams.get('role') ?? 'participant') as ParticipantRole

  // Validações de entrada
  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 })
  }
  if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 })
  }
  if (!Object.keys(ROLE_GRANTS).includes(role)) {
    return NextResponse.json({ error: `Invalid role. Valid roles: ${Object.keys(ROLE_GRANTS).join(', ')}` }, { status: 400 })
  }

  const apiKey   = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl    = process.env.NEXT_PUBLIC_LIVEKIT_URL

  // Log seguro (só para servidor, nunca exposto no response)
  console.log('[LiveKit] Token request:', {
    room,
    username,
    role,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    hasWsUrl: !!wsUrl,
  })

  if (!apiKey || !apiSecret || !wsUrl) {
    // Log detalhado apenas no servidor
    console.error('[LiveKit] ERRO: Variáveis de ambiente ausentes:', {
      LIVEKIT_API_KEY: !!apiKey,
      LIVEKIT_API_SECRET: !!apiSecret,
      NEXT_PUBLIC_LIVEKIT_URL: !!wsUrl,
    })
    // Response limpo para o cliente, sem vazar detalhes
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const ttl    = ROLE_TTL[role]
    const grants = ROLE_GRANTS[role]

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl,       // ← TTL explícito por cargo
      // Metadata útil para o console do intérprete e health monitor
      metadata: JSON.stringify({ role }),
    })

    at.addGrant({ ...grants, room })

    const token = await at.toJwt()

    console.log('[LiveKit] Token gerado com sucesso:', { room, username, role, ttl })

    return NextResponse.json({ token, url: wsUrl })
    //                                   ↑ url já embutido facilita o cliente
  } catch (error) {
    console.error('[LiveKit] Erro ao gerar token:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
