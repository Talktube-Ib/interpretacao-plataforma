import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
    let user;
    let profile;
    let meetings;

    try {
        const supabase = await createClient()
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
            redirect('/login')
        }
        user = authData.user

        const [{ data: profileData, error: profileError }, { data: meetingsData, error: meetingsError }] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', user.id)
                .maybeSingle(),
            supabase
                .from('meetings')
                .select('*')
                .eq('host_id', user.id)
                .order('start_time', { ascending: true })
        ])

        if (profileError) console.error("Error fetching dashboard profile:", profileError)
        profile = profileData

        if (meetingsError) console.error("Error fetching dashboard meetings:", meetingsError)
        meetings = meetingsData

    } catch (err) {
        console.error("CRITICAL ERROR IN DASHBOARD PAGE:", err)
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

    return <DashboardClient
        user={user}
        profile={profile || { id: user.id, full_name: null }}
        meetings={meetings || []}
        isDemo={false}
    />
}
