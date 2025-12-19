
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
        return <div className="p-8 text-red-500">Error loading meetings: {error.message}</div>
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Meeting Oversight</h1>

            <div className="rounded-md border border-white/10 bg-white/5">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-400">Title</TableHead>
                            <TableHead className="text-gray-400">Host</TableHead>
                            <TableHead className="text-gray-400">Status</TableHead>
                            <TableHead className="text-gray-400">Started</TableHead>
                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meetings.map((meeting) => (
                            <TableRow key={meeting.id} className="border-white/10 hover:bg-white/5">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center">
                                        <Video className="h-4 w-4 mr-2 text-gray-500" />
                                        {meeting.title}
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-300">
                                    {meeting.host?.full_name || meeting.host?.email}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${meeting.status === 'active' ? 'items-center gap-1 border-red-500 text-red-500 animate-pulse' :
                                            meeting.status === 'ended' ? 'border-gray-600 text-gray-500' :
                                                'border-green-500 text-green-500'}
                                    `}>
                                        {meeting.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                        {meeting.status.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
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
