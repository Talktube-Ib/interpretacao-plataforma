'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Video, Mic, Globe, MessageSquare, Monitor, HelpCircle, User, Shield, CheckCircle2, Star } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

export default function HelpPage() {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState('user')

    return (
        <div className="min-h-screen pb-20 animate-in fade-in duration-700">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-slate-950 px-6 py-16 md:py-24 border-b border-slate-800/50">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_50%)]" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                <div className="max-w-5xl mx-auto relative z-10 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Help & Support
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                        {t('help.title')}
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                        {t('help.subtitle')}
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 -mt-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-12">
                    <div className="flex justify-center">
                        <TabsList className="bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 backdrop-blur-xl shadow-2xl">
                            <TabsTrigger
                                value="user"
                                className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all duration-300 font-bold flex items-center gap-2"
                            >
                                <User className="h-4 w-4" />
                                {t('help.user_tab')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="interpreter"
                                className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all duration-300 font-bold flex items-center gap-2"
                            >
                                <Shield className="h-4 w-4" />
                                {t('help.interpreter_tab')}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* User Guide */}
                    <TabsContent value="user" className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
                        <div className="grid gap-8 md:grid-cols-2">
                            {/* Getting Started */}
                            <Card className="md:col-span-2 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group border-t-primary/20">
                                <CardHeader className="bg-slate-950/20 p-8 border-b border-slate-800/40">
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-blue-500/10 rounded-2xl ring-1 ring-blue-500/20">
                                            <Video className="h-6 w-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black leading-none">{t('help.categories.meetings')}</CardTitle>
                                            <CardDescription className="text-slate-400 mt-2 font-medium">{t('help.categories.meetings_desc')}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="item-1" className="border-slate-800/50">
                                            <AccordionTrigger className="text-lg font-bold hover:no-underline hover:text-primary transition-colors py-5">
                                                {t('help.questions.join_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                                                {t('help.questions.join_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-2" className="border-slate-800/50">
                                            <AccordionTrigger className="text-lg font-bold hover:no-underline hover:text-primary transition-colors py-5">
                                                {t('help.questions.audio_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                                                {t('help.questions.audio_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-3" className="border-none">
                                            <AccordionTrigger className="text-lg font-bold hover:no-underline hover:text-primary transition-colors py-5">
                                                {t('help.questions.speech_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                                                {t('help.questions.speech_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>

                            {/* Features */}
                            <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group border-t-purple-500/20">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
                                            <MessageSquare className="h-5 w-5 text-purple-500" />
                                        </div>
                                        <CardTitle className="text-xl font-bold">{t('help.categories.chat')}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-8 pb-8">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="item-1" className="border-slate-800/50">
                                            <AccordionTrigger className="font-bold hover:no-underline hover:text-purple-400 py-4">
                                                {t('help.questions.chat_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 pb-4">
                                                {t('help.questions.chat_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-2" className="border-none">
                                            <AccordionTrigger className="font-bold hover:no-underline hover:text-purple-400 py-4">
                                                {t('help.questions.hand_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 pb-4">
                                                {t('help.questions.hand_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group border-t-emerald-500/20">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-emerald-500/10 rounded-xl ring-1 ring-emerald-500/20">
                                            <Monitor className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <CardTitle className="text-xl font-bold">{t('help.categories.sharing')}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-8 pb-8">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="item-1" className="border-none">
                                            <AccordionTrigger className="font-bold hover:no-underline hover:text-emerald-400 py-4">
                                                {t('help.questions.share_q')}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-slate-400 pb-4">
                                                {t('help.questions.share_a')}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Interpreter Guide */}
                    <TabsContent value="interpreter" className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
                        <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden border-t-amber-500/20">
                            <CardHeader className="bg-slate-950/20 p-10 border-b border-slate-800/40">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-amber-500/10 rounded-2xl ring-1 ring-amber-500/20">
                                        <Globe className="h-8 w-8 text-amber-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl font-black tracking-tight">{t('help.categories.console')}</CardTitle>
                                        <CardDescription className="text-slate-400 text-lg mt-2 italic">{t('help.categories.console_desc')}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-10">
                                <div className="prose prose-invert max-w-none mb-10 text-slate-400 text-lg leading-relaxed">
                                    <p>{t('help.interpreter_desc')}</p>
                                </div>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1" className="border-slate-800/50">
                                        <AccordionTrigger className="text-lg font-bold hover:text-amber-500 py-6">
                                            {t('help.questions.no_console_q')}
                                        </AccordionTrigger>
                                        <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6 whitespace-pre-line">
                                            {t('help.questions.no_console_a')}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2" className="border-slate-800/50">
                                        <AccordionTrigger className="text-lg font-bold hover:text-amber-500 py-6">
                                            {t('help.questions.channel_q')}
                                        </AccordionTrigger>
                                        <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                                            {t('help.questions.channel_a')}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3" className="border-none">
                                        <AccordionTrigger className="text-lg font-bold hover:text-amber-500 py-6">
                                            {t('help.questions.handover_q')}
                                        </AccordionTrigger>
                                        <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                                            {t('help.questions.handover_a')}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-10 pb-6">
                                <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter text-indigo-400">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <Star className="h-6 w-6" />
                                    </div>
                                    {t('help.categories.best_practices')}
                                </h3>
                            </CardHeader>
                            <CardContent className="p-10 pt-0 space-y-4">
                                {Array.isArray(t('help.practices')) && (t('help.practices') as unknown as string[]).map((practice: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-slate-800/50 transition-all duration-300">
                                        <CheckCircle2 className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
                                        <p className="text-slate-300 font-medium leading-relaxed">{practice}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

