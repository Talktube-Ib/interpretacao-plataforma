
import { createClient } from '@/lib/supabase/server'
import { AgendaCalendar } from '@/components/agenda/agenda-calendar'

export default async function AgendaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch user's meetings (hosted) 
    const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .or(`host_id.eq.${user.id}`)
        .order('start_time', { ascending: true })

    return (
        <div className="p-8 h-full">
            <AgendaCalendar meetings={meetings || []} userId={user.id} />
        </div>
    )
}
