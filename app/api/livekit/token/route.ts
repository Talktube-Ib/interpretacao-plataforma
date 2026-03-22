import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30; // 30 seconds

// Tipos de cargo suportados
type ParticipantRole = 'admin' | 'interpreter' | 'participant'

// Permissões por cargo
const ROLE_CONFIGS: Record<ParticipantRole, any> = {
  admin: {
    roomJoin: true,
    roomAdmin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    ttl: 60 * 60 * 8,  // 8 horas
  },
  interpreter: {
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    ttl: 60 * 60 * 6,  // 6 horas
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

// FIX BUG 1: Resolução de Role via Banco de Dados (Segurança)
async function resolveRole(
  supabase: any,
  userId: string,
  roomId: string,
): Promise<ParticipantRole> {
  try {
    // 1. Verifica se é Admin Global
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin') return 'admin'

    // 2. Verifica se é o Host da sala específica
    const { data: meeting } = await supabase
      .from('meetings')
      .select('host_id')
      .eq('id', roomId)
      .single()

    if (meeting?.host_id === userId) return 'admin'

    // 3. Verifica se é Intérprete designado
    const { data: assignment } = await supabase
      .from('interpreter_assignments')
      .select('id')
      .eq('meeting_id', roomId)
      .eq('user_id', userId)
      .single()

    if (assignment) return 'interpreter'

    return 'participant'
  } catch (e) {
    console.error('[Token] Erro ao resolver role:', e)
    return 'participant'
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const room     = searchParams.get('room')
  const username = searchParams.get('username')
  const name     = searchParams.get('name') || username

  if (!room || !username) {
    return NextResponse.json({ error: 'Missing "room" or "username"' }, { status: 400 })
  }

  // Verificação de Segurança (Supabase Session)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isGuest = username?.startsWith('guest-')

  if (!user && !isGuest) {
      console.warn('[Security] Unauthorized token request blocked: no user session', { room, username })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey   = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl    = process.env.NEXT_PUBLIC_LIVEKIT_URL

  if (!apiKey || !apiSecret || !wsUrl) {
    console.error('[LiveKit] ERRO: Variáveis de ambiente ausentes')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    // RESOLVE ROLE (FIX BUG 1)
    const userId = user?.id || username
    const role = await resolveRole(supabase, userId, room)
    const roleConfig = ROLE_CONFIGS[role]

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: name || undefined,
      ttl: roleConfig.ttl,
      metadata: JSON.stringify({ role, userId }),
    })

    const { ttl, ...grants } = roleConfig
    at.addGrant({ ...grants, room })

    const token = await at.toJwt()

    console.log('[LiveKit] Token gerado com sucesso:', { room, username, role })

    // Retorna o role resolvido para o frontend (FIX BUG 5)
    return NextResponse.json({ token, url: wsUrl, role })
  } catch (error) {
    console.error('[LiveKit] Erro ao gerar token:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
