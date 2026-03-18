import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30; // 30 seconds

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
    ttl: 60 * 60 * 6,  // 6 horas (sessões longas de interpretação)
  },
  participant: {
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    ttl: 60 * 60 * 4,  // 4 horas
  },
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const room     = searchParams.get('room')
  const username = searchParams.get('username')
  const role     = (searchParams.get('role') ?? 'participant') as ParticipantRole

  // 1. Verificação de Segurança (Supabase Session)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isGuest = username?.startsWith('guest-')

  // Se não for um guest válido e não tiver sessão, bloqueia
  // A lógica de guest foi removida, então esta verificação pode ser simplificada
  if (!user && isGuest) { // Se for um guest (que não deveria mais existir) e não tiver user, bloqueia
      console.warn('[Security] Unauthorized token request blocked: guest role is deprecated', { room, username, role })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!user && !isGuest) { // Se não for guest e não tiver user, bloqueia
      console.warn('[Security] Unauthorized token request blocked: no user session', { room, username, role })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


  // Se for adm ou interpreter, OBRIGATÓRIO ter sessão válida no banco
  if ((role === 'admin' || role === 'interpreter') && !user) {
      console.warn('[Security] Privileged role requested without session:', { room, username, role })
      return NextResponse.json({ error: 'Unauthorized: Session required for this role' }, { status: 401 })
  }

  // Validações de entrada
  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 })
  }
  if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 })
  }
  if (!Object.keys(ROLE_CONFIGS).includes(role)) {
    return NextResponse.json({ error: `Invalid role. Valid roles: ${Object.keys(ROLE_CONFIGS).join(', ')}` }, { status: 400 })
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
    const roleConfig = ROLE_CONFIGS[role]

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: roleConfig.ttl,       // ← TTL explícito por cargo
      // Metadata útil para o console do intérprete e health monitor
      metadata: JSON.stringify({ role }),
    })

    // Extrai as permissões de grants, excluindo o ttl
    const { ttl, ...grants } = roleConfig
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
