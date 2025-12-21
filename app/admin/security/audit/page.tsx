
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

    // Handle case where table doesn't exist gracefully
    if (error && error.code === '42P01') { // undefined_table
        return (
            <div className="p-8 text-center space-y-4">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold">Tabela de Logs não encontrada</h2>
                <p className="text-muted-foreground">Por favor, execute o script SQL em <code>supabase/audit_logs.sql</code> no seu dashboard.</p>
            </div>
        )
    }

    if (error) {
        return <div className="p-8 text-destructive">Erro ao carregar logs: {error.message}</div>
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
                    <Shield className="h-8 w-8 text-primary" />
                    Registro de Auditoria
                </h1>
                <p className="text-muted-foreground mt-2">Logs imutáveis de todas as ações administrativas realizadas.</p>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit border border-border">
                {['all', 'USER_BAN', 'USER_PROMOTE', 'MEETING_FORCE_END', 'SETTINGS_UPDATE'].map((action) => (
                    <a
                        key={action}
                        href={`/admin/security/audit${action === 'all' ? '' : `?action=${action}`}`}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filterAction === action
                            ? 'bg-background text-foreground shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        {action.replace(/_/g, ' ').replace('all', 'Todos')}
                    </a>
                ))}
            </div>

            <div className="rounded-md border bg-card text-card-foreground overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Administrador</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Recurso</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!logs || logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    Nenhuma ação registrada ainda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{log.admin?.full_name || 'Admin'}</span>
                                            <span className="text-xs text-muted-foreground">{log.admin?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-foreground">
                                            {log.target_resource === 'user' ? <User className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                                            <span className="capitalize">{log.target_resource}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded border border-border">
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
