import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings-form'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="p-8 max-w-4xl animate-in fade-in duration-500 bg-background text-foreground">
            <div className="flex flex-col mb-10">
                <h1 className="text-4xl font-black tracking-tighter text-foreground">Configurações</h1>
                <p className="text-muted-foreground mt-1">Personalize sua identidade e preferências globais.</p>
            </div>

            <SettingsForm user={user} profile={profile} />
        </div>
    )
}
