'use client'

import { useState } from 'react'
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addDays,
    startOfMonth,
    endOfMonth,
    isSameMonth,
    addMonths,
    subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import CreateMeetingModal from '@/components/create-meeting-modal'

interface Meeting {
    id: string
    title: string
    start_time: string
    host_id: string
}

interface AgendaCalendarProps {
    meetings: Meeting[]
    userId: string
}

type ViewMode = 'month' | 'week'

export function AgendaCalendar({ meetings, userId }: AgendaCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<ViewMode>('month')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Navigation handlers
    const nextPeriod = () => {
        if (viewMode === 'month') {
            setCurrentDate(addMonths(currentDate, 1))
        } else {
            setCurrentDate(addDays(currentDate, 7))
        }
    }

    const prevPeriod = () => {
        if (viewMode === 'month') {
            setCurrentDate(subMonths(currentDate, 1))
        } else {
            setCurrentDate(addDays(currentDate, -7))
        }
    }

    const goToToday = () => {
        const today = new Date()
        setCurrentDate(today)
        setSelectedDate(today)
    }

    // Generate days based on view mode
    const days = viewMode === 'month'
        ? eachDayOfInterval({
            start: startOfWeek(startOfMonth(currentDate), { locale: ptBR }),
            end: endOfWeek(endOfMonth(currentDate), { locale: ptBR })
        })
        : eachDayOfInterval({
            start: startOfWeek(currentDate, { locale: ptBR }),
            end: endOfWeek(currentDate, { locale: ptBR })
        })

    // Get meetings for the selected date (for the side panel/list)
    const selectedDateMeetings = meetings.filter(m =>
        m.start_time && isSameDay(new Date(m.start_time), selectedDate)
    )

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black capitalize text-foreground">
                            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Semana de' d 'de' MMM", { locale: ptBR })}
                        </h2>
                        <div className="flex items-center bg-accent/50 rounded-lg border border-border ml-4">
                            <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-8 w-8 hover:bg-accent">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 text-[10px] font-black uppercase px-3 hover:bg-accent text-muted-foreground">
                                Hoje
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-8 w-8 hover:bg-accent">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center bg-accent/50 p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setViewMode('month')}
                            className={cn(
                                "px-3 py-1 text-sm rounded-md transition-all",
                                viewMode === 'month' ? "bg-[#06b6d4] text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={cn(
                                "px-3 py-1 text-sm rounded-md transition-all",
                                viewMode === 'week' ? "bg-[#06b6d4] text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            Semana
                        </button>
                    </div>
                </div>

                {/* Grid Header (Days of Week) */}
                <div className="grid grid-cols-7 border-b border-border bg-accent/20">
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                        <div key={day} className="py-2 text-center text-[10px] font-black tracking-widest text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className={cn(
                    "grid grid-cols-7 flex-1 overflow-y-auto",
                    viewMode === 'month' ? "auto-rows-[minmax(100px,1fr)]" : "auto-rows-[1fr]"
                )}>
                    {days.map((day, i) => {
                        const isToday = isSameDay(day, new Date())
                        const isSelected = isSameDay(day, selectedDate)
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const dayMeetings = meetings.filter(m => m.start_time && isSameDay(new Date(m.start_time), day))

                        return (
                            <div
                                key={i}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "border-b border-r border-border p-2 flex flex-col cursor-pointer transition-colors relative group",
                                    !isCurrentMonth && viewMode === 'month' ? "bg-accent/10 text-muted-foreground/50" : "bg-transparent text-foreground",
                                    isSelected ? "bg-accent/30" : "hover:bg-accent/10"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold",
                                        isToday ? "bg-[#06b6d4] text-white" : ""
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayMeetings.length > 0 && (
                                        <span className="text-[10px] font-black text-[#06b6d4] uppercase tracking-tighter">{dayMeetings.length} ev</span>
                                    )}
                                </div>

                                <div className="flex-1 mt-2 space-y-1 overflow-hidden">
                                    {dayMeetings.slice(0, 3).map(m => (
                                        <div key={m.id} className="text-[10px] bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] px-1.5 py-0.5 rounded truncate">
                                            {format(new Date(m.start_time), 'HH:mm')} {m.title}
                                        </div>
                                    ))}
                                    {dayMeetings.length > 3 && (
                                        <div className="text-[10px] text-gray-500 pl-1">
                                            + {dayMeetings.length - 3} mais
                                        </div>
                                    )}
                                </div>

                                {/* Hover Action to Create */}
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Side Panel / Details */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                    <h3 className="text-lg font-black tracking-tighter text-foreground mb-1 uppercase">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-6 font-medium">
                        {selectedDateMeetings.length === 0 ? 'Nenhum evento agendado.' : `${selectedDateMeetings.length} evento(s) agendado(s).`}
                    </p>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                        {selectedDateMeetings.map(meeting => (
                            <Card key={meeting.id} className="bg-accent/20 border-border hover:border-[#06b6d4]/30 transition-colors shadow-none rounded-xl">
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-foreground text-sm line-clamp-1">{meeting.title}</h4>
                                        <span className="text-xs font-black text-[#06b6d4]">
                                            {format(new Date(meeting.start_time), 'HH:mm')}
                                        </span>
                                    </div>
                                    <Button asChild size="sm" className="w-full h-8 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-lg font-bold border-0">
                                        <Link href={`/room/${meeting.id}`}>
                                            Entrar
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                        <CreateMeetingModal userId={userId} preselectedDate={selectedDate} />
                    </div>
                </div>

                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-border overflow-hidden shadow-none rounded-2xl">
                    <CardContent className="p-4">
                        <h4 className="font-black text-foreground mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#06b6d4]" />
                            Dica Pro
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Mantenha sua agenda organizada para garantir que os intérpretes certos estejam disponíveis.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
