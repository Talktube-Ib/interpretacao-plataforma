import { getAdminStats } from './fetchers'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Video, Activity, Clock, TrendingUp, Calendar } from 'lucide-react'

export default async function AdminDashboard() {
    const [
        { count: totalUsers },
        { count: totalMeetings },
        { count: activeMeetings },
        { data: recentUsers },
        { data: endedMeetings },
        { data: settings }
    ] = await getAdminStats()

    const maxCapacity = settings?.max_concurrent_meetings || 10
    const utilizationRate = Math.round(((activeMeetings || 0) / maxCapacity) * 100)

    // Calculate metrics
    const newUsersCount = recentUsers?.length || 0

    // Calculate total minutes (rough approximation if end_time exists)
    let totalMinutes = 0
    endedMeetings?.forEach(m => {
        if (m.start_time && m.end_time) {
            const start = new Date(m.start_time)
            const end = new Date(m.end_time)
            const duration = (end.getTime() - start.getTime()) / 1000 / 60 // minutes
            if (duration > 0) totalMinutes += duration
        }
    })

    // Format minutes/hours
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

    console.log('Rendering Admin Dashboard 2.0')
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Visão Geral - Admin 2.0 🚀</h1>
                <p className="text-gray-400">Métricas de saúde e crescimento do sistema.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">
                                {stat.title}
                            </CardTitle>
                            <div className={`${stat.bg} p-2 rounded-full`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <p className="text-xs text-gray-500">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions / Future Graph Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle>Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-white/10 rounded-lg">
                            Gráfico de atividade (Em breve)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-400" />
                            Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-gray-300">
                            <p className="mb-2">• <span className="text-green-400 font-semibold">{Number(activeMeetings) > 0 ? 'Alta Demanda' : 'Normal'}</span>: {activeMeetings} reuniões simultâneas.</p>
                            <p className="mb-2">• <span className="text-indigo-400 font-semibold">Ocupação</span>: {utilizationRate}% da capacidade global ({maxCapacity} salas).</p>
                            <p className="mb-2">• A base de usuários cresceu <span className="font-semibold text-white">{newUsersCount}</span> nesta semana.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
