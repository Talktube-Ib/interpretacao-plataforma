import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const diagnostic: any = {
        timestamp: new Date().toISOString(),
        server: {
            nodeVersion: process.version,
            platform: process.platform
        },
        env: {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            livekitKey: !!process.env.LIVEKIT_API_KEY,
        }
    }

    try {
        const supabase = await createAdminClient()
        
        // Test 1: Simple DB Auth Fetch
        const { data: users, error: userError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
        diagnostic.database = {
            authStatus: userError ? 'error' : 'ok',
            authMessage: userError?.message || 'Conexão Admin OK'
        }

        // Test 2: Profile table schema check (the most likely culprit)
        const { data: profileCheck, error: schemaError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
        
        diagnostic.schemaCheck = {
            status: schemaError ? 'error' : 'ok',
            message: schemaError?.message || 'Select * na tabela profiles OK',
            hint: schemaError?.hint || ''
        }

        if (schemaError?.message?.includes('personal_meeting_id')) {
            diagnostic.conclusion = "ERRO DETECTADO: A coluna 'personal_meeting_id' ainda está sendo referenciada ou existe no banco de dados causando conflitos."
        }

        return NextResponse.json(diagnostic)
    } catch (e: any) {
        return NextResponse.json({
            ...diagnostic,
            error: true,
            message: e.message || 'Erro catastrófico no servidor'
        }, { status: 500 })
    }
}
