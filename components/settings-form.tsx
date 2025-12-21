'use client'

import { updateProfile } from '@/app/dashboard/settings/actions'
import AvatarUpload from '@/components/avatar-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, Building, FileText, Languages, Shield, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SettingsFormProps {
    user: any
    profile: any
}

export default function SettingsForm({ user, profile }: SettingsFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
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

                            <div className="space-y-3 p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Languages className="h-4 w-4 text-purple-400" />
                                    <Label htmlFor="languages" className="text-[10px] font-black uppercase tracking-widest text-purple-400">Canal do Intérprete</Label>
                                </div>
                                <Input
                                    id="languages"
                                    name="languages"
                                    defaultValue={profile?.languages?.join(', ') || ''}
                                    className="bg-background border-border text-foreground h-12 rounded-xl placeholder:text-muted-foreground/50"
                                    placeholder="ex: pt, en, es (separados por vírgula)"
                                />
                                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                    Cadastre aqui os idiomas que você domina. Isso habilitará controles extras de voz e canais exclusivos durante as transmissões.
                                </p>
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

                <Card className="bg-destructive/5 border-destructive/20 text-card-foreground rounded-[2rem] overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-destructive text-xl font-black flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Zona de Segurança
                        </CardTitle>
                        <CardDescription className="text-destructive/60">Gerenciamento crítico de conta.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                            <p className="text-sm text-muted-foreground font-medium">Todos os seus dados serão apagados permanentemente.</p>
                            <Button variant="destructive" disabled className="opacity-50 h-10 px-8 rounded-xl font-bold">
                                Excluir Conta
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
                {/* Global Connectivity Card - Placeholder for future features */}
            </div>
        </div>
    )
}
