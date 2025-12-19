import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile } from './actions'
import { User, Shield, Languages, Globe } from 'lucide-react'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="p-8 max-w-4xl animate-in fade-in duration-500 bg-background text-foreground">
            <div className="flex flex-col mb-10">
                <h1 className="text-4xl font-black tracking-tighter text-foreground">Configurações</h1>
                <p className="text-muted-foreground mt-1">Personalize sua identidade e preferências globais.</p>
            </div>

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
                        <form action={updateProfile}>
                            <CardContent className="space-y-6 pt-8">
                                <div className="flex items-center gap-6 mb-8 p-6 bg-accent/20 rounded-3xl border border-border">
                                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center font-black text-3xl text-white shadow-xl shadow-[#06b6d4]/20 border-2 border-white/20">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">Avatar</span>
                                        <Button variant="outline" size="sm" className="bg-background border-border rounded-xl hover:bg-[#06b6d4]/20 hover:text-[#06b6d4] transition-all">
                                            Alterar Imagem
                                        </Button>
                                    </div>
                                </div>

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
                                </div>

                                <div className="space-y-3 p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Languages className="h-4 w-4 text-purple-400" />
                                        <Label htmlFor="languages" className="text-[10px] font-black uppercase tracking-widest text-purple-400">Canal do Intérprete</Label>
                                    </div>
                                    <Input
                                        id="languages"
                                        name="languages"
                                        defaultValue={profile?.limits?.languages?.join(', ') || ''}
                                        className="bg-background border-border text-foreground h-12 rounded-xl placeholder:text-muted-foreground/50"
                                        placeholder="ex: pt, en, es (separados por vírgula)"
                                    />
                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                        Cadastre aqui os idiomas que você domina. Isso habilitará controles extras de voz e canais exclusivos durante as transmissões.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-accent/5 border-t border-border p-8">
                                <Button type="submit" className="bg-[#06b6d4] hover:bg-[#0891b2] w-full h-14 rounded-2xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-[#06b6d4]/20 border-0">
                                    Atualizar Preferências
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

                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-[#06b6d4]/10 to-transparent border-border rounded-[2rem] p-8 shadow-sm">
                        <Globe className="h-10 w-10 text-[#06b6d4] mb-6" />
                        <h3 className="text-xl font-black mb-2 text-foreground">Conectividade Global</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Suas preferências de idioma afetam como o sistema roteia o áudio em tempo real.
                            Mantenha seus idiomas atualizados para garantir a melhor latência.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
