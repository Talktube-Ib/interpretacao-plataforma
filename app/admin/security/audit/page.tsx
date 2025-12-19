import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, User, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function AuditLogPage({
    searchParams,
}: {
    searchParams: { action?: string }
}) {
    const supabase = await createClient()
    const filterAction = (await searchParams).action || 'all'

    let dbQuery = supabase
        .from('audit_logs')
        .select(`
            *,
            admin:admin_id (
                full_name,
                email
            )
        `)

    if (filterAction !== 'all') {
        dbQuery = dbQuery.eq('action', filterAction)
    }

    const { data: logs, error } = await dbQuery
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) {
        return <div className="p-8 text-red-500">Erro ao carregar logs: {error.message}</div>
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Shield className="h-8 w-8 text-[#06b6d4]" />
                    Registro de Auditoria
                </h1>
                <p className="text-gray-400 mt-2">Logs imutáveis de todas as ações administrativas realizadas.</p>
            </div>

            <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit border border-white/10">
                {['all', 'USER_BAN', 'USER_PROMOTE', 'MEETING_FORCE_END', 'SETTINGS_UPDATE'].map((action) => (
                    <a
                        key={action}
                        href={`/admin/security/audit${action === 'all' ? '' : `?action=${action}`}`}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filterAction === action
                                ? 'bg-[#06b6d4] text-white font-medium'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {action.replace(/_/g, ' ').replace('all', 'Todos')}
                    </a>
                ))}
            </div>

            <div className="rounded-md border border-white/10 bg-white/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-gray-400">Data/Hora</TableHead>
                            <TableHead className="text-gray-400">Administrador</TableHead>
                            <TableHead className="text-gray-400">Ação</TableHead>
                            <TableHead className="text-gray-400">Recurso</TableHead>
                            <TableHead className="text-gray-400">Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!logs || logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                                    Nenhuma ação registrada ainda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell className="text-gray-400 text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{log.admin?.full_name || 'Admin'}</span>
                                            <span className="text-xs text-gray-500">{log.admin?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4] bg-[#06b6d4]/5">
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            {log.target_resource === 'user' ? <User className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                                            <span className="capitalize">{log.target_resource}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded border border-white/5">
                                            {JSON.stringify(log.details)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
