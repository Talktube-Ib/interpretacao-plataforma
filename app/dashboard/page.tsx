import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            redirect('/login')
        }

        const [{ data: profile, error: profileError }, { data: meetings, error: meetingsError }] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, full_name, personal_meeting_id')
                .eq('id', user.id)
                .maybeSingle(),
            supabase
                .from('meetings')
                .select('*')
                .eq('host_id', user.id)
                .order('start_time', { ascending: true })
        ])

        if (profileError) console.error("Error fetching dashboard profile:", profileError)
        if (meetingsError) console.error("Error fetching dashboard meetings:", meetingsError)

        return <DashboardClient
            user={user}
            profile={profile || { id: user.id, full_name: null, personal_meeting_id: null }}
            meetings={meetings || []}
            isDemo={false}
        />
    } catch (err) {
        console.error("CRITICAL ERROR IN DASHBOARD PAGE:", err)
        // Redireciona para login ou mostra uma mensagem de erro controlada
        // Para evitar loop de redirecionamento se o problema for no middleware:
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-6">
                <div className="max-w-md w-full space-y-4 text-center">
                    <h1 className="text-2xl font-bold text-red-500">Erro de Conexão</h1>
                    <p className="text-gray-400">Não foi possível carregar o dashboard. Por favor, verifique sua conexão ou tente novamente mais tarde.</p>
                    <a href="/login" className="inline-block mt-4 text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-widest text-xs">Voltar para Login</a>
                </div>
            </div>
        )
    }
}
