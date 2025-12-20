'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface GrowthChartProps {
    data: any[]
}

export function GrowthChart({ data }: GrowthChartProps) {
    return (
        <Card className="col-span-4 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-400" />
                    Crescimento da Plataforma (30 Dias)
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Novos usuários e reuniões realizadas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#9ca3af' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="users"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorUsers)"
                                name="Novos Usuários"
                            />
                            <Area
                                type="monotone"
                                dataKey="meetings"
                                stroke="#82ca9d"
                                fillOpacity={1}
                                fill="url(#colorMeetings)"
                                name="Reuniões"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
