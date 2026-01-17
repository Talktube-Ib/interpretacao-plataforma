import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Term {
    id: string
    term: string
    definition?: string
}

export function useSmartGlossary(meetingId: string, textToAnalyze: string) {
    const [terms, setTerms] = useState<Term[]>([])
    const [detectedTerms, setDetectedTerms] = useState<Term[]>([])
    const [loading, setLoading] = useState(true)

    // 1. Fetch Terms
    useEffect(() => {
        if (!meetingId) return

        const fetchTerms = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('glossary_terms')
                .select('*')
                .eq('meeting_id', meetingId)

            if (!error && data) {
                setTerms(data)
            }
            setLoading(false)
        }

        fetchTerms()

        // Subscription for real-time updates?
        const supabase = createClient()
        const channel = supabase.channel(`glossary:${meetingId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'glossary_terms', filter: `meeting_id=eq.${meetingId}` },
                () => fetchTerms() // Lazy implementation: just refetch
            )
            .subscribe()

        return () => { channel.unsubscribe() }
    }, [meetingId])

    // 2. Analyze Text
    useEffect(() => {
        if (!textToAnalyze || terms.length === 0) return

        // Simple strict match for now. Efficient Aho-Corasick would be better for scale.
        const found = terms.filter(t => {
            const regex = new RegExp(`\\b${t.term}\\b`, 'i') // word boundary, case insensitive
            return regex.test(textToAnalyze)
        })

        // Limit to recently found to avoid clutter? 
        // Or return all matches in the current text block.
        // Let's return unique matches.
        if (found.length > 0) {
            setDetectedTerms(prev => {
                // Add new ones to the top
                const newOnes = found.filter(f => !prev.some(p => p.id === f.id))
                return [...newOnes, ...prev].slice(0, 5) // Keep last 5 unique detected
            })
        }
    }, [textToAnalyze, terms])

    return { terms, detectedTerms, loading }
}
