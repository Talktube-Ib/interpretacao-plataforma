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
            const nextMonth = addMonths(currentDate, 1)
            setCurrentDate(nextMonth)
            setSelectedDate(startOfMonth(nextMonth))
        } else {
            const nextWeek = addDays(currentDate, 7)
            setCurrentDate(nextWeek)
        }
    }

    const prevPeriod = () => {
        if (viewMode === 'month') {
            const prevMonth = subMonths(currentDate, 1)
            setCurrentDate(prevMonth)
            setSelectedDate(startOfMonth(prevMonth))
        } else {
            const prevWeek = addDays(currentDate, -7)
            setCurrentDate(prevWeek)
        }
    }

    const goToToday = () => {
        const today = new Date()
        setCurrentDate(today)
        setSelectedDate(today)
    }

    const days = viewMode === 'month'
        ? eachDayOfInterval({
            start: startOfWeek(startOfMonth(currentDate), { locale: ptBR }),
            end: endOfWeek(endOfMonth(currentDate), { locale: ptBR })
        })
        : eachDayOfInterval({
            start: startOfWeek(currentDate, { locale: ptBR }),
            end: endOfWeek(currentDate, { locale: ptBR })
        })

    const selectedDateMeetings = meetings.filter(m =>
        m.start_time && isSameDay(new Date(m.start_time), selectedDate)
    )

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Header */}
                <div className="p-8 border-b border-slate-800/40 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/20">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-500/10 rounded-2xl ring-1 ring-cyan-500/20">
                                <CalendarIcon className="h-6 w-6 text-cyan-500" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter capitalize text-foreground drop-shadow-sm">
                                {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Semana de' d 'de' MMM", { locale: ptBR })}
                            </h2>
                        </div>

                        <div className="flex items-center bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800/50 shadow-inner">
                            <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-10 w-10 hover:bg-white/5 rounded-xl transition-all">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={goToToday}
                                className={cn(
                                    "h-10 px-4 text-xs font-black uppercase tracking-widest hover:bg-white/5 text-cyan-500 transition-all",
                                    isSameDay(currentDate, new Date()) && "opacity-40 grayscale pointer-events-none"
                                )}
                            >
                                Hoje
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-10 w-10 hover:bg-white/5 rounded-xl transition-all">
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800/50">
                        <button
                            onClick={() => setViewMode('month')}
                            className={cn(
                                "px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                viewMode === 'month' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={cn(
                                "px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                viewMode === 'week' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Semana
                        </button>
                    </div>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-7 border-b border-slate-800/40 bg-slate-950/30">
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                        <div key={day} className="py-4 text-center text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                {/* Calendar Grid */}
                <div className={cn(
                    "grid grid-cols-7 flex-1 overflow-y-auto w-full",
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
                                    "border-b border-r border-slate-800/30 p-2 sm:p-3 flex flex-col items-start justify-start cursor-pointer transition-all duration-200 relative group min-h-[100px]",
                                    !isCurrentMonth && viewMode === 'month' ? "bg-slate-950/60 opacity-40 grayscale" : "bg-transparent",
                                    isSelected ? "bg-cyan-500/5 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]" : "hover:bg-white/[0.02]"
                                )}
                            >
                                {/* Day Number */}
                                <div className="w-full flex justify-between items-start mb-2">
                                    <span className={cn(
                                        "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                                        isToday
                                            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105"
                                            : isSelected
                                                ? "text-cyan-400 font-bold bg-cyan-950/30"
                                                : "text-slate-400 group-hover:text-slate-200"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Events List (Desktop/Tablet) */}
                                <div className="w-full flex flex-col gap-1">
                                    {dayMeetings.slice(0, 3).map(m => (
                                        <div
                                            key={m.id}
                                            className="hidden sm:flex items-center gap-1.5 px-1.5 py-1 rounded-[4px] bg-cyan-500/10 border-l-2 border-cyan-500 hover:bg-cyan-500/20 transition-colors w-full overflow-hidden"
                                        >
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                                            <span className="text-[9px] font-medium text-cyan-100 truncate w-full leading-none">
                                                {m.title}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Mobile Dot Indicator */}
                                    <div className="flex sm:hidden gap-1 flex-wrap content-start pl-1">
                                        {dayMeetings.slice(0, 4).map(m => (
                                            <div key={m.id} className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                        ))}
                                        {dayMeetings.length > 4 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        )}
                                    </div>

                                    {/* More Indicator */}
                                    {dayMeetings.length > 3 && (
                                        <div className="hidden sm:block text-[9px] font-medium text-slate-500 pl-1">
                                            +{dayMeetings.length - 3} mais
                                        </div>
                                    )}
                                </div>

                                {/* Selection Indicator Line */}
                                {isSelected && (
                                    <div className="absolute top-0 left-0 h-full w-[2px] bg-cyan-500" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Side Panel */}
            <div className="w-full lg:w-[400px] flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-1000">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-800/50 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors duration-700" />

                    <div className="relative space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter text-foreground uppercase border-l-4 border-cyan-500 pl-4">
                                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium italic">
                                {selectedDateMeetings.length === 0 ? 'Nenhum evento para este dia.' : `${selectedDateMeetings.length} compromisso(s) agendado(s).`}
                            </p>
                        </div>

                        <div className="space-y-4 max-h-[450px] overflow-y-auto no-scrollbar pr-2">
                            {selectedDateMeetings.map(meeting => (
                                <div key={meeting.id} className="group/card relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl opacity-0 group-hover/card:opacity-20 transition duration-500 blur" />
                                    <Card className="relative bg-slate-950/40 border-slate-800/50 group-hover/card:border-cyan-500/30 transition-all duration-500 rounded-3xl overflow-hidden shadow-none">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-foreground text-base leading-tight group-hover/card:text-cyan-400 transition-colors">{meeting.title}</h4>
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span className="text-xs font-medium">{format(new Date(meeting.start_time), 'HH:mm')}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-cyan-500/10 rounded-xl">
                                                    <Video className="h-4 w-4 text-cyan-500" />
                                                </div>
                                            </div>
                                            <Button asChild className="w-full h-12 bg-white/5 hover:bg-cyan-600 text-foreground hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-800/50 transition-all duration-500 shadow-xl">
                                                <Link href={`/room/${meeting.id}`}>
                                                    Acessar Sala de Interpretação
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-slate-800/40">
                            <CreateMeetingModal userId={userId} preselectedDate={selectedDate} />
                        </div>
                    </div>
                </div>

                <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border-slate-800/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl group border-l-purple-500/30 border-l-4">
                    <CardContent className="p-8 relative">
                        <div className="absolute top-4 right-8">
                            <Sparkles className="h-8 w-8 text-cyan-500/20 animate-pulse" />
                        </div>
                        <h4 className="font-black text-foreground text-xl mb-3 flex items-center gap-3 tracking-tight">
                            <div className="bg-white/5 p-2 rounded-xl">
                                <Sparkles className="h-5 w-5 text-cyan-500" />
                            </div>
                            Dica Pro
                        </h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            Mantenha sua agenda organizada para garantir que os <span className="text-cyan-500">intérpretes certos</span> estejam disponíveis para suas reuniões globais.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
