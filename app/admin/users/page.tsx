
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
        return <div className="p-8 text-red-500">Error loading users: {error.message}</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">User Management</h1>
                <form className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        name="q"
                        defaultValue={query}
                        placeholder="Search name or email..."
                        className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                </form>
            </div>

            <div className="rounded-md border border-white/10 bg-white/5">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-400">Name</TableHead>
                            <TableHead className="text-gray-400">Email</TableHead>
                            <TableHead className="text-gray-400">Papel</TableHead>
                            <TableHead className="text-gray-400">Status</TableHead>
                            <TableHead className="text-gray-400">Limites (M/P/R)</TableHead>
                            <TableHead className="text-right text-gray-400">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id} className="border-white/10 hover:bg-white/5">
                                <TableCell className="font-medium text-white">
                                    <div className="flex flex-col">
                                        <span>{profile.full_name || 'Usuário'}</span>
                                        <span className="text-xs text-gray-400 font-mono">{profile.id.slice(0, 8)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-300">{profile.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${profile.role === 'admin' ? 'border-orange-500 text-orange-500 bg-orange-500/5' :
                                            profile.role === 'interpreter' ? 'border-blue-500 text-blue-500 bg-blue-500/5' :
                                                profile.role === 'host' ? 'border-green-500 text-green-500 bg-green-500/5' :
                                                    'border-gray-500 text-gray-500'}
                                    `}>
                                        {profile.role.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {profile.status === 'active' ? (
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
                                    <div className="text-xs text-gray-400 flex gap-2">
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
