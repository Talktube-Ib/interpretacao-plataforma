import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert, ShieldCheck, UserCog, Ban } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Log {
    id: string
    action: string
    created_at: string
    admin: { email: string }
    details: any
}

interface SecurityLogWidgetProps {
    logs: Log[]
}

export function SecurityLogWidget({ logs }: SecurityLogWidgetProps) {
    const getIcon = (action: string) => {
        if (action.includes('BAN')) return <Ban className="h-4 w-4 text-red-500" />
        if (action.includes('KILL')) return <ShieldAlert className="h-4 w-4 text-orange-500" />
        if (action.includes('UPDATE')) return <UserCog className="h-4 w-4 text-blue-500" />
        return <ShieldCheck className="h-4 w-4 text-gray-500" />
    }

    return (
        <Card className="col-span-full xl:col-span-3 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-gray-400" />
                    Auditoria de Segurança
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Últimas ações administrativas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="mt-1 p-1 bg-white/5 rounded-full">
                                {getIcon(log.action)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-white truncate break-words">
                                    {log.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    por {log.admin?.email?.split('@')[0]}
                                </p>
                            </div>
                            <div className="text-xs text-gray-600 whitespace-nowrap">
                                {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            Nenhum registro recente
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
