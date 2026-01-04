'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Megaphone, Plus, Trash2, Send } from 'lucide-react'
import { createAnnouncement, deleteAnnouncement } from '@/app/admin/actions'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminMessagesPage() {
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<any[]>([])

    useEffect(() => {
        const fetchMessages = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
            if (data) setMessages(data)
        }
        fetchMessages()
    }, [loading])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await createAnnouncement(formData)
        if (!result.success) {
            alert(result.error)
        } else {
            alert('Comunicado enviado com sucesso!')
            // Reset loading to trigger refetch via useEffect
        }
        setLoading(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este aviso?')) return

        setLoading(true)
        const result = await deleteAnnouncement(id)
        if (!result.success) {
            alert(result.error)
        } else {
            setMessages(prev => prev.filter(m => m.id !== id))
        }
        setLoading(false)
    }

    return (
        <div className="space-y-8 pt-8 px-4 md:px-8 pb-12 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl">
                        <Megaphone className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    Comunicados Globais
                </h1>
                <p className="text-muted-foreground text-lg ml-1">Central de avisos e notificações para todos os usuários.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Create Form */}
                <Card className="xl:col-span-4 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl h-fit sticky top-8">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Novo Comunicado
                        </CardTitle>
                        <CardDescription>Aparecerá instantaneamente no painel de todos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-400 ml-1">Tipo de Aviso</Label>
                                <Select name="type" defaultValue="info" required>
                                    <SelectTrigger className="bg-slate-950/50 border-slate-800 hover:border-primary/50 text-foreground h-11 transition-all">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 shadow-2xl z-[100]">
                                        <SelectItem value="update" className="focus:bg-primary/20 cursor-pointer py-2.5">🚀 Novidade / Atualização</SelectItem>
                                        <SelectItem value="maintenance" className="focus:bg-primary/20 cursor-pointer py-2.5">🔧 Manutenção</SelectItem>
                                        <SelectItem value="alert" className="focus:bg-primary/20 cursor-pointer py-2.5">⚠️ Alerta Importante</SelectItem>
                                        <SelectItem value="info" className="focus:bg-primary/20 cursor-pointer py-2.5">ℹ️ Informação Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-slate-400 ml-1">Título</Label>
                                <Input
                                    name="title"
                                    id="title"
                                    placeholder="Ex: Atualização do Tradutor"
                                    className="bg-slate-950/50 border-slate-800 focus:border-primary/50 text-foreground h-11"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content" className="text-sm font-semibold text-slate-400 ml-1">Mensagem</Label>
                                <Textarea
                                    name="content"
                                    id="content"
                                    placeholder="Descreva o que mudou ou qual o aviso..."
                                    className="bg-slate-950/50 border-slate-800 focus:border-primary/50 text-foreground min-h-[180px] resize-none"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-primary-foreground h-12 shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">Publicando...</span>
                                ) : (
                                    <>Publicar Comunicado <Send className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <div className="xl:col-span-8 space-y-4">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h2 className="text-xl font-bold text-foreground">Histórico de Envios</h2>
                        <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{messages.length} mensagens</span>
                    </div>

                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <Card className="bg-slate-900/20 border-border/30 border-dashed py-12">
                                <CardContent className="flex flex-col items-center justify-center text-center">
                                    <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground font-medium">Nenhum comunicado enviado ainda.</p>
                                    <p className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">Suas mensagens publicadas aparecerão aqui.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            messages.map((msg, index) => (
                                <Card
                                    key={msg.id}
                                    className="group relative bg-slate-900/40 border-slate-800/50 hover:border-primary/30 transition-all duration-300 overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-right-4"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardContent className="p-5 flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-foreground text-xl tracking-tight leading-tight">
                                                    {msg.title}
                                                </h4>
                                            </div>
                                            <p className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap max-w-4xl">
                                                {msg.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                                                <span className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md">
                                                    ID: {msg.id.substring(0, 8)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    Enviado em {new Date(msg.created_at).toLocaleDateString()} às {new Date(msg.created_at).toLocaleTimeString().substring(0, 5)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 shrink-0 transition-colors"
                                            onClick={() => handleDelete(msg.id)}
                                            disabled={loading}
                                            title="Excluir comunicado"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
