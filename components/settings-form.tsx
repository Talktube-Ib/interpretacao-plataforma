'use client'

import { updateProfile, updatePassword } from '@/app/dashboard/settings/actions'
import AvatarUpload from '@/components/avatar-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, Building, FileText, Languages, Shield, User, Lock, Key, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SettingsFormProps {
    user: any
    profile: any
}

export default function SettingsForm({ user, profile }: SettingsFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('profile')

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab) setActiveTab(tab)
    }, [searchParams])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await updateProfile(formData)
            if (result && !result.success) {
                alert(`Erro ao atualizar: ${result.error}`)
            } else {
                alert('Informações atualizadas com sucesso!')
            }
        } catch (err) {
            alert('Erro inesperado ao atualizar.')
        } finally {
            setLoading(false)
        }
    }

    async function handlePasswordSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await updatePassword(formData)
            if (result && !result.success) {
                alert(`Erro ao alterar senha: ${result.error}`)
            } else {
                alert('Senha alterada com sucesso!')
                // Clear inputs manually if needed, or rely on form reset
                const form = document.getElementById('password-form') as HTMLFormElement
                if (form) form.reset()
            }
        } catch (err) {
            alert('Erro inesperado ao alterar senha.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            <div className="flex justify-center md:justify-start">
                <TabsList className="bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
                    <TabsTrigger
                        value="profile"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all duration-300 font-bold"
                    >
                        <User className="w-4 h-4 mr-2" />
                        Perfil Público
                    </TabsTrigger>
                    <TabsTrigger
                        value="security"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all duration-300 font-bold"
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        Segurança & Senha
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="profile" className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-slate-900/40 border-slate-800/50 text-card-foreground overflow-hidden rounded-[2.5rem] shadow-2xl backdrop-blur-xl relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardHeader className="bg-slate-950/20 border-b border-slate-800/40 p-10">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-primary/10 rounded-[1.5rem] ring-1 ring-primary/20 shadow-inner">
                                <User className="h-8 w-8 text-primary animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                                    Informações do Perfil
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-lg mt-1 font-medium italic">
                                    Sua identidade digital na plataforma.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <form action={handleSubmit}>
                        <CardContent className="p-10 space-y-10">
                            <div className="flex flex-col items-center md:items-start">
                                <AvatarUpload
                                    uid={user.id}
                                    url={profile?.avatar_url}
                                    email={user.email!}
                                    onUploadComplete={(url) => {
                                        router.refresh()
                                    }}
                                />
                                <p className="text-xs text-slate-500 mt-4 uppercase tracking-[0.2em] font-black opacity-50">Avatar do Sistema</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="group space-y-3">
                                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Endereço de Email</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500">@</div>
                                        <Input
                                            id="email"
                                            value={user.email}
                                            disabled
                                            className="bg-slate-950/30 border-slate-800/50 text-slate-500 h-14 rounded-2xl pl-12 italic cursor-not-allowed opacity-70"
                                        />
                                    </div>
                                </div>
                                <div className="group space-y-3">
                                    <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            defaultValue={profile?.full_name || ''}
                                            className="bg-slate-950/50 border-slate-800/50 text-foreground h-14 rounded-2xl pl-12 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 font-medium"
                                            placeholder="Ex: Carlos Oliveira"
                                        />
                                    </div>
                                </div>
                                <div className="group space-y-3">
                                    <Label htmlFor="jobTitle" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Cargo / Função</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id=" jobTitle"
                                            name="jobTitle"
                                            defaultValue={profile?.job_title || ''}
                                            className="bg-slate-950/50 border-slate-800/50 text-foreground h-14 rounded-2xl pl-12 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 font-medium"
                                            placeholder="Ex: CEO, Intérprete Sênior"
                                        />
                                    </div>
                                </div>
                                <div className="group space-y-3">
                                    <Label htmlFor="company" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Empresa / Instituição</Label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="company"
                                            name="company"
                                            defaultValue={profile?.company || ''}
                                            className="bg-slate-950/50 border-slate-800/50 text-foreground h-14 rounded-2xl pl-12 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 font-medium"
                                            placeholder="Nome da sua organização"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="group space-y-3">
                                <Label htmlFor="bio" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Biografia Profissional</Label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-5 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <Textarea
                                        id="bio"
                                        name="bio"
                                        defaultValue={profile?.bio || ''}
                                        className="bg-slate-950/50 border-slate-800/50 text-foreground rounded-[1.5rem] pl-12 pt-4 min-h-[140px] resize-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 leading-relaxed font-medium"
                                        placeholder="Conte um pouco sobre sua trajetória no mundo da interpretação..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-950/20 border-t border-slate-800/40 p-10">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 w-full h-16 rounded-[1.5rem] font-black text-xl tracking-tight transition-all active:scale-[0.98] shadow-2xl shadow-primary/20 hover:shadow-primary/40 border-0 flex items-center justify-center gap-3"
                            >
                                {loading ? 'Sincronizando...' : (
                                    <>Salvar Preferências <Check className="w-5 h-5" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-slate-900/40 border-slate-800/50 text-card-foreground overflow-hidden rounded-[2.5rem] shadow-2xl backdrop-blur-xl relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="bg-slate-950/20 border-b border-slate-800/40 p-10">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-orange-500/10 rounded-[1.5rem] ring-1 ring-orange-500/20 shadow-inner">
                                <Lock className="h-8 w-8 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                                    Segurança de Acesso
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-lg mt-1 font-medium italic">Proteja sua conta com uma senha forte.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form action={handlePasswordSubmit} id="password-form">
                        <CardContent className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="group space-y-3">
                                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-orange-500">Nova Credencial</Label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="bg-slate-950/50 border-slate-800/50 text-foreground h-14 rounded-2xl pl-12 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-300"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                </div>
                                <div className="group space-y-3">
                                    <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 ml-1 transition-colors group-focus-within:text-orange-500">Confirmar Nova Senha</Label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            className="bg-slate-950/50 border-slate-800/50 text-foreground h-14 rounded-2xl pl-12 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-300"
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-950/20 border-t border-slate-800/40 p-10">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-orange-500 hover:bg-orange-600 w-full h-16 rounded-[1.5rem] font-black text-xl tracking-tight transition-all active:scale-[0.98] shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/40 border-0 flex items-center justify-center gap-3 text-white"
                            >
                                {loading ? 'Validando...' : (
                                    <>Autenticar Mudança <Shield className="w-5 h-5" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card className="bg-red-500/5 border-red-500/20 text-card-foreground rounded-[2.5rem] overflow-hidden shadow-2xl shadow-red-500/5">
                    <CardHeader className="p-10 pb-6">
                        <CardTitle className="text-red-500 text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Shield className="h-6 w-6" />
                            </div>
                            Zona Crítica
                        </CardTitle>
                        <CardDescription className="text-red-400/60 font-medium italic mt-2">Ações que removem permanentemente o seu acesso.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 pt-0">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-red-500/10 rounded-[1.5rem] border border-red-500/20 group hover:border-red-500/40 transition-all duration-500">
                            <div className="text-center md:text-left">
                                <h4 className="font-extrabold text-red-500 text-lg uppercase tracking-tight">Encerrar Conta</h4>
                                <p className="text-slate-400 font-medium mt-1">Isso apagará seu histórico de reuniões e arquivos.</p>
                            </div>
                            <Button variant="destructive" disabled className="opacity-40 h-14 px-10 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-red-500/20 cursor-not-allowed">
                                Conta Blindada
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
