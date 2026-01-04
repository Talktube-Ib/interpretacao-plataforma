import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePlatformSettings } from './actions'
import { Settings, AlertTriangle, Save } from 'lucide-react'

export default async function AdminSettingsPage() {
    const supabase = await createClient()
    const { data: settings } = await supabase.from('platform_settings').select('*').single()

    // Default connection if table is empty (should satisfy via schema default insert)
    const safeSettings = settings || {
        maintenance_mode: false,
        registration_open: true,
        max_concurrent_meetings: 10
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Settings className="h-8 w-8 text-gray-400" />
                    Configurações Globais
                </h1>
                <p className="text-gray-400 mt-2">
                    Controle os parâmetros críticos da infraestrutura e regras de negócio.
                </p>
            </div>

            <form action={updatePlatformSettings} className="space-y-6">

                {/* Critical Controls */}
                <Card className="bg-red-950/10 border-red-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            Zona de Perigo
                        </CardTitle>
                        <CardDescription>Ações que afetam a disponibilidade da plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">Modo de Manutenção</Label>
                                <p className="text-sm text-gray-400">
                                    Bloqueia o acesso de todos os usuários (exceto Admins).
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="maintenance_mode" defaultChecked={safeSettings.maintenance_mode} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">Registro de Usuários</Label>
                                <p className="text-sm text-gray-400">
                                    Permitir que novas contas sejam criadas publicamente.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="registration_open" defaultChecked={safeSettings.registration_open} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Capacity Settings */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle>Capacidade & Limites</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="max_concurrent" className="text-white">Máx. Reuniões Simultâneas</Label>
                            <Input
                                id="max_concurrent"
                                name="max_concurrent_meetings"
                                type="number"
                                defaultValue={safeSettings.max_concurrent_meetings}
                                className="bg-white/5 border-white/10 text-white"
                            />
                            <p className="text-xs text-gray-500">
                                Define o hard-limit do servidor. Acima disso, novas reuniões entram em fila.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" className="bg-[#06b6d4] hover:bg-[#0891b2] text-white">
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações Globais
                    </Button>
                </div>
            </form>
        </div>
    )
}
