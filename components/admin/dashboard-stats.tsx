import { getAdminStats } from '@/app/admin/fetchers'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Activity, Clock, TrendingUp, Calendar } from 'lucide-react'

export async function AdminDashboardStats() {
    const [
        { count: totalUsers },
        { count: totalMeetings },
        { count: activeMeetings },
        { data: recentUsers },
        { data: endedMeetings }
    ] = await getAdminStats()

    const newUsersCount = recentUsers?.length || 0

    let totalMinutes = 0
    endedMeetings?.forEach(m => {
        if (m.start_time && m.end_time) {
            const start = new Date(m.start_time)
            const end = new Date(m.end_time)
            const duration = (end.getTime() - start.getTime()) / 1000 / 60
            if (duration > 0) totalMinutes += duration
        }
    })

    const timeDisplay = totalMinutes > 120
        ? `${(totalMinutes / 60).toFixed(1)} Horas`
        : `${Math.floor(totalMinutes)} Minutos`

    const stats = [
        {
            title: "Usuários Totais",
            value: totalUsers || 0,
            description: `+${newUsersCount} nos últimos 7 dias`,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Reuniões Realizadas",
            value: totalMeetings || 0,
            description: "Desde o início",
            icon: Calendar,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "Em Andamento",
            value: activeMeetings || 0,
            description: "Salas ativas agora",
            icon: Activity,
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Tempo de Plataforma",
            value: timeDisplay,
            description: "Total de interpretação",
            icon: Clock,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        }
    ]

    return (
        <div className="space-y-8 bg-background text-foreground">
            <div>
                <h1 className="text-3xl font-black tracking-tighter text-foreground">Visão Geral - Admin 2.0 🚀</h1>
                <p className="text-muted-foreground">Métricas de saúde e crescimento do sistema.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="bg-card border-border hover:border-[#06b6d4]/40 transition-all shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`${stat.bg} p-2 rounded-xl`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground mb-1">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-black tracking-tighter text-foreground">Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-[2rem]">
                            Gráfico de atividade (Em breve)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tighter text-foreground">
                            <TrendingUp className="h-5 w-5 text-indigo-400" />
                            Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-foreground">
                            <p className="mb-2">• <span className="text-green-500 font-bold">{Number(activeMeetings) > 0 ? 'Alta Demanda' : 'Normal'}</span>: {activeMeetings} reuniões simultâneas.</p>
                            <p className="mb-2 text-muted-foreground">• A base de usuários cresceu <span className="font-bold text-foreground">{newUsersCount}</span> nesta semana.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
