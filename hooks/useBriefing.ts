'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface BriefingDocument {
    id: string
    name: string
    url: string
    type: string
    created_at: string
}

export function useBriefing(meetingId: string) {
    const [documents, setDocuments] = useState<BriefingDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)

    const fetchDocuments = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('briefing_documents')
            .select('*')
            .eq('meeting_id', meetingId)
            .order('created_at', { ascending: false })

        if (data) setDocuments(data)
        setLoading(false)
    }

    useEffect(() => {
        if (!meetingId) return
        fetchDocuments()

        const supabase = createClient()
        const channel = supabase.channel(`briefing:${meetingId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'briefing_documents', filter: `meeting_id=eq.${meetingId}` },
                () => fetchDocuments()
            )
            .subscribe()

        return () => { channel.unsubscribe() }
    }, [meetingId])

    const uploadDocument = async (file: File) => {
        setUploading(true)
        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${meetingId}/${Math.random().toString(36).substr(2, 9)}.${fileExt}`

            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('briefing-materials')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('briefing-materials')
                .getPublicUrl(fileName)

            // Insert Metadata
            const { error: dbError } = await supabase
                .from('briefing_documents')
                .insert({
                    meeting_id: meetingId,
                    name: file.name,
                    url: publicUrl,
                    type: file.type
                })

            if (dbError) throw dbError

        } catch (error) {
            console.error("Upload failed", error)
            alert("Erro ao fazer upload do documento.")
        } finally {
            setUploading(false)
        }
    }

    const deleteDocument = async (docId: string) => {
        const supabase = createClient()
        await supabase.from('briefing_documents').delete().eq('id', docId)
    }

    return {
        documents,
        loading,
        uploading,
        uploadDocument,
        deleteDocument
    }
}
