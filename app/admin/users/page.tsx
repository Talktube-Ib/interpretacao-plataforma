
'use server'

import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table"
import { Badge } from "../../../components/ui/badge"
import { Input } from "../../../components/ui/input"
import { Search } from 'lucide-react'
import { CreateUserDialog } from './create-user-dialog'
import { UserActionsClient } from './user-actions-client'

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: { q?: string }
}) {
    const supabase = await createClient()
    const query = (await searchParams).q || ''

    let dbQuery = supabase
        .from('profiles')
        .select('*')

    if (query) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    }

    const { data: profiles, error } = await dbQuery.order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-destructive">Erro ao carregar usuários: {error.message}</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
                <div className="flex items-center gap-4">
                    <form className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            name="q"
                            defaultValue={query}
                            placeholder="Buscar nome ou email..."
                            className="pl-10 bg-background border-input"
                        />
                    </form>
                    <CreateUserDialog />
                </div>
            </div>

            <div className="rounded-md border bg-card text-card-foreground">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-muted/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Papel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Limites (M/P/R)</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{profile.full_name || 'Usuário'}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{profile.id.slice(0, 8)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${profile.role === 'admin' ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                                            (profile.role === 'interpreter' ? 'border-cyan-500 text-cyan-500 bg-cyan-500/10' :
                                                'border-blue-500 text-blue-500 bg-blue-500/10')}
                                    `}>
                                        {profile.role === 'admin' ? 'ADMIN' : (profile.role === 'interpreter' ? 'INTÉRPRETE' : 'USUÁRIO')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {(!profile.status || profile.status === 'active') ? (
                                        <div className="flex items-center text-green-500 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Ativo
                                        </div>
                                    ) : profile.status === 'suspended' ? (
                                        <div className="flex items-center text-yellow-500 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2 animate-pulse" /> Suspenso
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-red-500 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Banido
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span title="Max Reuniões">M:{profile.limits?.max_meetings || 1}</span>
                                        <span title="Max Participantes">P:{profile.limits?.max_participants || 5}</span>
                                        <span title="Gravação">{profile.limits?.can_record ? 'R:✅' : 'R:❌'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <UserActionsClient profile={profile} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
