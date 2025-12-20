import { getAdminStats } from './fetchers'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Video, Activity, Clock, TrendingUp, Calendar } from 'lucide-react'
import { GrowthChart } from './charts/growth-chart'
import { StatusChart } from './charts/status-chart'
import { SecurityLogWidget } from './charts/security-log-widget'

export default async function AdminDashboard() {
    const [
        { count: totalUsers },
        { count: totalMeetings },
        { count: activeMeetings },
        { data: recentUsers },
        { data: growthUsers }, // 30 days
        { data: growthMeetings }, // 30 days
        { data: endedMeetings },
        { data: settings },
        { data: logs }
    ] = await getAdminStats()

    const maxCapacity = settings?.max_concurrent_meetings || 10
    const utilizationRate = Math.round(((activeMeetings || 0) / maxCapacity) * 100)

    // Calculate metrics
    const newUsersCount = recentUsers?.length || 0

    // Process Growth Data (Last 30 days by day)
    const dailyStats = new Map<string, { users: number, meetings: number }>()
    // Initialize map with last 30 days to ensure continuity
    for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        dailyStats.set(dayStr, { users: 0, meetings: 0 })
    }

    growthUsers?.forEach(u => {
        const day = new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        if (dailyStats.has(day)) {
            const current = dailyStats.get(day)!
            dailyStats.set(day, { ...current, users: current.users + 1 })
        }
    })

    growthMeetings?.forEach(m => {
        const day = new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        if (dailyStats.has(day)) {
            const current = dailyStats.get(day)!
            dailyStats.set(day, { ...current, meetings: current.meetings + 1 })
        }
    })

    const chartData = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        users: stats.users,
        meetings: stats.meetings
    }))

    // Process Status Distribution
    const statusCounts = {
        active: activeMeetings || 0,
        scheduled: (totalMeetings || 0) - (activeMeetings || 0) - (endedMeetings?.length || 0),
        ended: endedMeetings?.length || 0
    }
    // Correct scheduled calculation (total - active - ended might be negative if logic is weird, so clamp)
    // Actually, growthMeetings has all meetings for last 30 days, need to be careful.
    // Let's rely on the simple counts we have.
    // Note: totalMeetings is TOTAL count.

    // Better approximation if we don't fetch all meetings:
    // We only fetched ended meetings to calc duration.
    // Let's trust the counts but careful with 'scheduled'.

    // Actually, 'endedMeetings' variable above only holds ended meetings *with valid times*, not necessarily ALL ended meetings count.
    // But we have totalMeetings count.

    const statusData = [
        { name: 'Em Andamento', value: statusCounts.active, color: '#10b981' }, // green-500
        { name: 'Agendadas', value: Math.max(0, (totalMeetings || 0) - statusCounts.active - (endedMeetings?.length || 0)), color: '#8b5cf6' }, // violet-500
        { name: 'Encerradas', value: endedMeetings?.length || 0, color: '#64748b' } // slate-500
    ]


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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Visão Geral - Admin 2.0 🚀
                </h1>
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

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Growth Chart */}
                <GrowthChart data={chartData} />

                {/* Status Distribution */}
                <StatusChart data={statusData} />
            </div>

            {/* Security Logs */}
            <div className="grid gap-6 grid-cols-1">
                <SecurityLogWidget logs={logs?.map((l: any) => ({
                    ...l,
                    admin: Array.isArray(l.admin) ? l.admin[0] : l.admin // Handle Supabase single relation join weirdness
                })) || []} />
            </div>
        </div>
    )
}
