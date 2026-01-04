
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
import { Video } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KillMeetingButton } from './kill-button'
import { CleanupButton } from './cleanup-button'
import { KillAllButton } from './kill-all-button'

export default async function AdminMeetingsPage() {
    const supabase = await createClient()

    // Join with profiles to get host name
    const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
            *,
            host:host_id (
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-destructive">Error loading meetings: {error.message}</div>
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Reuniões</h1>
                <div className="flex gap-2">
                    <KillAllButton />
                    <CleanupButton />
                </div>
            </div>

            <div className="rounded-md border bg-card text-card-foreground">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-muted/50">
                            <TableHead>Title</TableHead>
                            <TableHead>Host</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meetings.map((meeting) => (
                            <TableRow key={meeting.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        <Video className="h-4 w-4 mr-2 text-muted-foreground" />
                                        {meeting.title}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {meeting.host?.full_name || meeting.host?.email}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${meeting.status === 'active' ? 'items-center gap-1 border-red-500 text-red-500 animate-pulse' :
                                            meeting.status === 'ended' ? 'border-muted-foreground text-muted-foreground' :
                                                'border-green-500 text-green-500'}
                                    `}>
                                        {meeting.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                        {meeting.status.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {meeting.start_time ? formatDistanceToNow(new Date(meeting.start_time), { addSuffix: true, locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {meeting.status !== 'ended' && (
                                        <KillMeetingButton meetingId={meeting.id} />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
