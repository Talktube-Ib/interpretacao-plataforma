'use client'

import { updateProfile, updatePassword } from '@/app/dashboard/settings/actions'
import AvatarUpload from '@/components/avatar-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, Building, FileText, Languages, Shield, User, Lock, Key } from 'lucide-react'
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <User className="w-4 h-4 mr-2" />
                    Perfil Público
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Segurança & Senha
                </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="bg-card border-border text-card-foreground overflow-hidden rounded-[2rem] shadow-xl">
                    <CardHeader className="bg-accent/5 border-b border-border pb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#06b6d4]/10 rounded-2xl">
                                <User className="h-6 w-6 text-[#06b6d4]" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black">Informações do Perfil</CardTitle>
                                <CardDescription className="text-muted-foreground">Como você é visto na rede.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    {/* Native form with client-side interception */}
                    <form action={handleSubmit}>
                        <CardContent className="space-y-6 pt-8">
                            <AvatarUpload
                                uid={user.id}
                                url={profile?.avatar_url}
                                email={user.email!}
                                onUploadComplete={(url) => {
                                    router.refresh()
                                }}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Principal</Label>
                                    <Input
                                        id="email"
                                        value={user.email}
                                        disabled
                                        className="bg-muted border-border text-muted-foreground h-12 rounded-xl italic"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        defaultValue={profile?.full_name || ''}
                                        className="bg-background border-border text-foreground h-12 rounded-xl focus:ring-2 focus:ring-[#06b6d4]/20 focus:border-[#06b6d4] transition-all"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3 w-3 text-[#06b6d4]" />
                                        <Label htmlFor="jobTitle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargo / Função</Label>
                                    </div>
                                    <Input
                                        id="jobTitle"
                                        name="jobTitle"
                                        defaultValue={profile?.job_title || ''}
                                        className="bg-background border-border text-foreground h-12 rounded-xl"
                                        placeholder="Ex: CEO, Intérprete Sênior"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-3 w-3 text-[#06b6d4]" />
                                        <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresa / Agência</Label>
                                    </div>
                                    <Input
                                        id="company"
                                        name="company"
                                        defaultValue={profile?.company || ''}
                                        className="bg-background border-border text-foreground h-12 rounded-xl"
                                        placeholder="Nome da sua organização"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-[#06b6d4]" />
                                    <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Biografia Resumida</Label>
                                </div>
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    defaultValue={profile?.bio || ''}
                                    className="bg-background border-border text-foreground rounded-2xl min-h-[100px] resize-none"
                                    placeholder="Conte um pouco sobre sua trajetória profissional..."
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="bg-accent/5 border-t border-border p-8">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-[#06b6d4] hover:bg-[#0891b2] w-full h-14 rounded-2xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-[#06b6d4]/20 border-0"
                            >
                                {loading ? 'Salvando...' : 'Atualizar Preferências'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="bg-card border-border text-card-foreground overflow-hidden rounded-[2rem] shadow-xl">
                    <CardHeader className="bg-accent/5 border-b border-border pb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-2xl">
                                <Lock className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black">Alterar Senha</CardTitle>
                                <CardDescription className="text-muted-foreground">Gerencie o acesso à sua conta.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form action={handlePasswordSubmit} id="password-form">
                        <CardContent className="space-y-6 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</Label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="bg-background border-border text-foreground h-12 rounded-xl pl-10"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Senha</Label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            className="bg-background border-border text-foreground h-12 rounded-xl pl-10"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-accent/5 border-t border-border p-8">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-orange-500 hover:bg-orange-600 w-full h-14 rounded-2xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-orange-500/20 border-0"
                            >
                                {loading ? 'Processando...' : 'Alterar Senha'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card className="bg-destructive/5 border-destructive/20 text-card-foreground rounded-[2rem] overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-destructive text-xl font-black flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Zona de Perigo
                        </CardTitle>
                        <CardDescription className="text-destructive/60">Ações irreversíveis.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                            <div>
                                <h4 className="font-bold text-destructive">Excluir Conta</h4>
                                <p className="text-sm text-muted-foreground font-medium">Todos os seus dados serão apagados permanentemente.</p>
                            </div>
                            <Button variant="destructive" disabled className="opacity-50 h-10 px-8 rounded-xl font-bold">
                                Excluir Conta
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
