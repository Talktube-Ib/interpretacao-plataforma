'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Settings, Share2, Video, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateMeetingModal from '@/components/create-meeting-modal'
import { InstantMeetingButton } from '@/components/dashboard/instant-meeting-button'
import { ShareMeetingDialog } from '@/components/share-meeting-dialog'
import { DemoBanner } from '@/components/demo-banner'
import { useLanguage } from '@/components/providers/language-provider'

interface DashboardClientProps {
    user: any
    profile: any
    meetings: any[] | null
    isDemo: boolean
}

export default function DashboardClient({ user, profile, meetings, isDemo }: DashboardClientProps) {
    const { t } = useLanguage()
    const personalRoomId = profile?.personal_meeting_id || user.id

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-cyan-500/30 overflow-x-hidden">
            {isDemo && <DemoBanner />}

            {/* Minimal Transparent Header */}
            <div className="py-6 px-10 flex border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto max-w-[1600px] flex justify-between items-center group">
                    <h1 className="text-2xl font-black text-foreground tracking-tighter flex items-center gap-3">
                        <span className="p-2 bg-cyan-600 rounded-xl shadow-lg shadow-cyan-600/20 group-hover:scale-110 transition-transform duration-500 hover:rotate-12">
                            <Video className="h-5 w-5 text-white" />
                        </span>
                        TalkTube
                        <span className="text-muted-foreground font-medium text-xs tracking-widest uppercase ml-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            {t('common.video_conf_software')}
                        </span>
                    </h1>
                </div>
            </div>

            <main className="container mx-auto px-6 py-12 max-w-[1600px] animate-in fade-in slide-in-from-bottom-4 duration-1000">

                {/* Hero / Action Section */}
                <div className="flex flex-col xl:flex-row gap-10 mb-16">
                    {/* Personal Room Card - Major Visual Focus */}
                    <div className="flex-[1.5] relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-[3rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative h-full bg-slate-950 border border-slate-800/50 rounded-[2.5rem] p-10 overflow-hidden flex flex-col justify-center shadow-2xl">
                            {/* Animated Background Orbs */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 group-hover:bg-cyan-600/20 transition-colors duration-1000 animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 animate-pulse delay-700" />

                            <div className="relative z-10 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-ping" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Always Active</span>
                                </div>
                                <h2 className="text-5xl font-black text-white mb-4 tracking-tighter leading-tight drop-shadow-md">
                                    {t('dashboard.personal_room_title')}
                                </h2>
                                <p className="text-slate-400 mb-10 text-xl font-medium leading-relaxed max-w-xl italic">
                                    {t('dashboard.personal_room_desc')}
                                </p>

                                <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-900/60 backdrop-blur-md p-2.5 pl-8 rounded-[2rem] border border-slate-800/50 group/input focus-within:border-cyan-500/30 transition-all duration-500 shadow-inner">
                                    <span className="text-slate-500 font-mono text-sm truncate flex-1 tracking-tight">
                                        talktube.io/room/{personalRoomId}
                                    </span>
                                    <div className="flex gap-3 w-full lg:w-auto">
                                        <ShareMeetingDialog
                                            roomId={personalRoomId}
                                            trigger={
                                                <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-2xl transition-all">
                                                    <Share2 className="h-4 w-4 mr-2" />
                                                    {t('common.copy')}
                                                </Button>
                                            }
                                        />
                                        <Link href={`/room/${personalRoomId}`} className="w-full">
                                            <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-[10px] h-12 px-10 rounded-2xl shadow-xl shadow-cyan-600/20 group-hover:scale-105 transition-all duration-500 flex items-center justify-center gap-2">
                                                <Video className="h-4 w-4" />
                                                {t('common.enter')}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                <Link href="/dashboard/settings" className="mt-10 inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-cyan-500 transition-colors group/link">
                                    <div className="p-2 bg-white/5 rounded-xl group-hover/link:bg-cyan-500/10 transition-colors">
                                        <Settings className="h-4 w-4 group-hover/link:rotate-90 transition-transform duration-500" />
                                    </div>
                                    {t('dashboard.edit_room_settings')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Meeting Card */}
                    <div className="flex-1 min-w-[380px] group transition-all duration-500">
                        <div className="h-full bg-indigo-600/5 dark:bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 dark:border-slate-800/50 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-xl border-t-indigo-500/30">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            <div className="mb-8 p-6 bg-indigo-500/10 rounded-[2rem] ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Sparkles className="h-10 w-10 text-indigo-400 animate-pulse" />
                            </div>

                            <h3 className="text-2xl font-black text-foreground mb-4 tracking-tighter uppercase border-b-2 border-indigo-500/30 pb-2 inline-block">
                                {t('dashboard.quick_meeting_title')}
                            </h3>
                            <div className="w-full mt-4 group-hover:scale-105 transition-transform duration-500">
                                <InstantMeetingButton />
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-8 max-w-[220px] leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                                {t('dashboard.quick_meeting_desc')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Schedule/Sub Sections */}
                <div className="bg-slate-900/20 backdrop-blur-xl rounded-[3rem] p-12 shadow-2xl border border-slate-800/40 relative group/section">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-[3rem] opacity-0 group-hover/section:opacity-100 transition-opacity duration-1000" />

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-[0.3em] pl-6 border-l-4 border-cyan-500 leading-none">
                                    {t('common.schedule')}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-10">
                                    {meetings ? meetings.length : 0} Compromissos Agendados
                                </p>
                            </div>
                            <div className="group/btn">
                                <CreateMeetingModal userId={user.id} />
                            </div>
                        </div>

                        {/* List/Table Header */}
                        <div className="hidden md:grid grid-cols-12 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-6 px-10">
                            <div className="col-span-12 md:col-span-5">{t('common.event')}</div>
                            <div className="hidden md:block col-span-3">{t('common.organizer')}</div>
                            <div className="hidden md:block col-span-2">{t('common.time')}</div>
                            <div className="col-span-12 md:col-span-2 text-right">{t('common.action')}</div>
                        </div>

                        <div className="space-y-4">
                            {!meetings || meetings.length === 0 ? (
                                <div className="text-center py-24 bg-slate-950/20 rounded-[2.5rem] border border-slate-800/30 border-dashed">
                                    <div className="inline-flex p-8 rounded-full bg-slate-900 shadow-inner mb-6 ring-1 ring-slate-800 animate-bounce">
                                        <Calendar className="h-10 w-10 text-slate-700" />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-sm italic">{t('dashboard.no_meetings')}</p>
                                </div>
                            ) : (
                                meetings.map((meeting) => (
                                    <div key={meeting.id} className="group/row relative">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl opacity-0 group-hover/row:opacity-100 transition duration-500 blur-sm" />
                                        <div className="relative grid grid-cols-12 items-center p-6 bg-slate-950/40 backdrop-blur-sm border border-slate-800/50 hover:border-cyan-500/30 rounded-3xl transition-all duration-500 shadow-xl overflow-hidden group-hover/row:translate-x-1">
                                            <div className="col-span-12 md:col-span-5 font-bold text-foreground truncate flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center font-black text-sm text-cyan-500 shadow-lg group-hover/row:scale-110 group-hover/row:rotate-3 transition-all duration-500">
                                                    {meeting.title.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-lg tracking-tight group-hover/row:text-cyan-400 transition-colors uppercase font-black">{meeting.title}</span>
                                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5 ring-1 ring-slate-800 px-2 py-0.5 rounded-full w-fit">
                                                        <Video className="h-2.5 w-2.5" /> Room Active
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="hidden md:block col-span-3 text-sm font-bold text-slate-300 items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                                    </div>
                                                    {profile?.full_name || t('common.you')}
                                                </div>
                                            </div>
                                            <div className="hidden md:block col-span-2 text-sm font-black text-slate-400 group-hover/row:text-foreground transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-cyan-500" />
                                                    {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-2 text-right flex items-center justify-end gap-3 mt-4 md:mt-0">
                                                <ShareMeetingDialog
                                                    roomId={meeting.id}
                                                    trigger={
                                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all border border-transparent hover:border-cyan-500/20">
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <Link href={`/room/${meeting.id}`}>
                                                    <Button variant="outline" className="h-10 px-6 border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-400 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all group-hover/row:shadow-lg group-hover/row:shadow-cyan-600/10">
                                                        {t('common.enter')}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
