'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, RefreshCcw, Wifi, Database, Lock, User } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function DebugPage() {
    const [results, setResults] = useState<{
        supabase: { status: 'loading' | 'ok' | 'error', message?: string },
        auth: { status: 'loading' | 'ok' | 'error', user?: any, message?: string },
        profile: { status: 'loading' | 'ok' | 'error', data?: any, message?: string },
        env: { status: 'loading' | 'ok' | 'error', keys?: string[], message?: string }
    }>({
        supabase: { status: 'loading' },
        auth: { status: 'loading' },
        profile: { status: 'loading' },
        env: { status: 'loading' }
    })

    const runTests = async () => {
        setResults({
            supabase: { status: 'loading' },
            auth: { status: 'loading' },
            profile: { status: 'loading' },
            env: { status: 'loading' }
        })

        const supabase = createClient()

        // 1. Supabase Connection
        try {
            const { error } = await supabase.from('meetings').select('id').limit(1)
            if (error) throw error
            setResults(prev => ({ ...prev, supabase: { status: 'ok', message: 'Conexão estável com Supabase' } }))
        } catch (e: any) {
            setResults(prev => ({ ...prev, supabase: { status: 'error', message: e.message || 'Erro ao conectar ao banco' } }))
        }

        // 2. Auth Session
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error
            if (user) {
                setResults(prev => ({ ...prev, auth: { status: 'ok', user, message: `Logado como: ${user.email}` } }))
                
                // 3. Profile Fetch (checking for schema issues)
                try {
                    const { data: profile, error: pError } = await supabase
                        .from('profiles')
                        .select('id, full_name, role, status')
                        .eq('id', user.id)
                        .maybeSingle()
                    
                    if (pError) throw pError
                    setResults(prev => ({ ...prev, profile: { status: 'ok', data: profile, message: 'Perfil carregado com sucesso' } }))
                } catch (pe: any) {
                    setResults(prev => ({ ...prev, profile: { status: 'error', message: `Erro no Perfil: ${pe.message}. Isso sugere problema no esquema ou RLS.` } }))
                }

            } else {
                setResults(prev => ({ ...prev, auth: { status: 'ok', message: 'Nenhum usuário logado (Visitante)' } }))
                setResults(prev => ({ ...prev, profile: { status: 'ok', message: 'N/A para visitantes' } }))
            }
        } catch (e: any) {
            setResults(prev => ({ ...prev, auth: { status: 'error', message: e.message || 'Erro ao verificar sessão' } }))
        }

        // 4. Client Env Vars
        const vars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'NEXT_PUBLIC_LIVEKIT_URL'
        ]
        const available = vars.filter(v => !!process.env[v])
        setResults(prev => ({ 
            ...prev, 
            env: { 
                status: available.length === vars.length ? 'ok' : 'error', 
                keys: available,
                message: available.length === vars.length ? 'Variáveis de ambiente públicas OK' : `Faltando: ${vars.filter(v => !process.env[v]).join(', ')}`
            } 
        }))
    }

    useEffect(() => {
        runTests()
    }, [])

    return (
        <div className="min-h-screen bg-[#020817] text-white p-6 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Logo />
                    <Button variant="outline" size="sm" onClick={runTests} className="gap-2">
                        <RefreshCcw className="w-4 h-4" /> Recarregar
                    </Button>
                </div>
                
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight">Diagnóstico de Sistema</h1>
                    <p className="text-gray-400 text-sm">
                        Use esta tela para identificar por que o servidor está retornando erro no seu dispositivo.
                    </p>
                </div>

                <div className="grid gap-4">
                    {/* Supabase */}
                    <StatusCard 
                        title="Banco de Dados (Supabase)" 
                        icon={<Database className="w-5 h-5" />}
                        status={results.supabase.status}
                        message={results.supabase.message}
                    />

                    {/* Auth */}
                    <StatusCard 
                        title="Autenticação" 
                        icon={<Lock className="w-5 h-5" />}
                        status={results.auth.status}
                        message={results.auth.message}
                    />

                    {/* Profile */}
                    <StatusCard 
                        title="Esquema de Perfil" 
                        icon={<User className="w-5 h-5" />}
                        status={results.profile.status}
                        message={results.profile.message}
                        detail={results.profile.data ? JSON.stringify(results.profile.data, null, 2) : undefined}
                    />

                    {/* Env */}
                    <StatusCard 
                        title="Ambiente (Client)" 
                        icon={<Wifi className="w-5 h-5" />}
                        status={results.env.status}
                        message={results.env.message}
                    />
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-xs text-yellow-500 leading-relaxed">
                        <strong>Nota:</strong> Se todas as luzes estiverem verdes aqui, mas o erro persistir nas outras páginas, 
                        o problema é provavelmente em uma <strong>Server Action</strong> ou no <strong>Middleware</strong> que 
                        roda apenas no lado do servidor (Node.js).
                    </p>
                </div>
            </div>
        </div>
    )
}

function StatusCard({ title, icon, status, message, detail }: { 
    title: string, 
    icon: React.ReactNode, 
    status: 'loading' | 'ok' | 'error',
    message?: string,
    detail?: string
}) {
    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <div className="text-gray-400">{icon}</div>
                    <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
                </div>
                <div>
                    {status === 'loading' && <RefreshCcw className="w-4 h-4 text-gray-500 animate-spin" />}
                    {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                    {message || 'Aguardando...'}
                </p>
                {detail && (
                    <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] text-gray-500 overflow-x-auto">
                        {detail}
                    </pre>
                )}
            </CardContent>
        </Card>
    )
}
