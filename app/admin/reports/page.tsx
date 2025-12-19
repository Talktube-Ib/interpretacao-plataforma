import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Download, Languages, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AdminReportsPage() {
    const supabase = await createClient()

    // Fetch some basic stats for the report
    const { data: usageData } = await supabase
        .from('meetings')
        .select('allowed_languages, start_time, end_time')
        .eq('status', 'ended')

    // Simple language usage calculation
    const langStats: Record<string, number> = {}
    usageData?.forEach(m => {
        m.allowed_languages?.forEach((lang: string) => {
            langStats[lang] = (langStats[lang] || 0) + 1
        })
    })

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-[#06b6d4]" />
                        Relatórios e Analytics
                    </h1>
                    <p className="text-gray-400 mt-2">Insights detalhados sobre o uso da plataforma e adoção de idiomas.</p>
                </div>
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF/CSV
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Languages className="h-4 w-4 text-violet-400" />
                            Uso por Idioma
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(langStats).map(([lang, count]) => (
                                <div key={lang} className="flex items-center justify-between">
                                    <span className="text-gray-300 uppercase font-mono">{lang}</span>
                                    <div className="flex flex-1 mx-4 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-violet-500"
                                            style={{ width: `${(count / (usageData?.length || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-white font-medium">{count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-400" />
                            Top Hosts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-gray-500 text-sm italic">
                            Dados de engajamento individual (Em breve)
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-400" />
                            Eficiência de Tempo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-white">84%</div>
                            <p className="text-xs text-gray-400">Taxa de reuniões que utilizaram intérpretes.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle>Histórico de Uso Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg text-gray-600">
                        Gráfico de barras: Reuniões vs Tempo (Agregado por mês)
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
