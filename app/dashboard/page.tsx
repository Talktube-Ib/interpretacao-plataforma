import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Globe, Clock, Shield, Sparkles } from 'lucide-react'
import CreateMeetingModal from '@/components/create-meeting-modal'
import { AdminDashboardStats } from '@/components/admin/dashboard-stats'
import { QuickJoinCard } from '@/components/dashboard/quick-join-card'
import { MeetingCard } from '@/components/dashboard/meeting-card'
import { InstantMeetingButton } from '@/components/dashboard/instant-meeting-button'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check Role & Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, limits')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'
    const languages = profile?.limits?.languages || []

    // If Admin, show "Command Center"
    if (role === 'admin') {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <main className="container mx-auto px-4 py-8">
                    <AdminDashboardStats />
                </main>
            </div>
        )
    }

    // Fetch meetings
    const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .or(`host_id.eq.${user.id}`)
        .order('start_time', { ascending: true })

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-[#06b6d4]/30">
            <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'} <span className="inline-block animate-wave">👋</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg font-medium">Seu centro de comando para conexões globais.</p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                        <InstantMeetingButton />
                        <CreateMeetingModal userId={user.id} />
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { label: 'Reuniões', value: meetings?.length || 0, icon: Calendar, color: 'text-[#06b6d4]' },
                        { label: 'Idiomas', value: languages.length || 0, icon: Globe, color: 'text-purple-400' },
                        { label: 'Minutos', value: '120+', icon: Clock, color: 'text-amber-400' },
                        { label: 'Status', value: 'Premium', icon: Shield, color: 'text-emerald-400' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-5 hover:bg-accent/50 transition-all group shadow-sm">
                            <stat.icon className={`h-5 w-5 ${stat.color} mb-3 group-hover:scale-110 transition-transform`} />
                            <div className="text-2xl font-black text-foreground">{stat.value}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    <div className="lg:col-span-1">
                        <QuickJoinCard />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/5 border border-border rounded-[2.5rem] p-8 h-full flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#06b6d4]/10 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="p-6 bg-background/50 backdrop-blur-sm rounded-[2rem] border border-border">
                                    <Sparkles className="h-10 w-10 text-[#06b6d4]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight mb-2 text-foreground">Poder da Interpretação</h2>
                                    <p className="text-muted-foreground max-w-lg leading-relaxed">
                                        Cadastre seus idiomas nas configurações para desbloquear a <b>Consola do Intérprete</b>.
                                        Transforme qualquer reunião em um evento global em segundos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-foreground">
                        <div className="w-10 h-10 bg-[#06b6d4]/10 rounded-xl flex items-center justify-center border border-[#06b6d4]/20">
                            <Calendar className="h-5 w-5 text-[#06b6d4]" />
                        </div>
                        Próximas Reuniões
                    </h2>
                </div>

                {/* Meeting List */}
                {!meetings || meetings.length === 0 ? (
                    <div className="text-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center shadow-inner">
                        <div className="p-8 rounded-full bg-accent/50 mb-8 border border-border">
                            <Calendar className="h-16 w-16 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter mb-3 uppercase text-foreground">Rádio em Silêncio</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                            Nenhum evento agendado. Comece criando sua primeira sala agora mesmo.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                        {meetings.map((meeting) => (
                            <MeetingCard key={meeting.id} meeting={meeting} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

