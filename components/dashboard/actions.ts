'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateSlug } from '@/lib/utils'

export async function ensureWelcomeMessage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if user has any messages
    const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)

    if (count === 0) {
        // Create Welcome Message
        await supabase
            .from('messages')
            .insert({
                sender_id: 'system', // or null if your schema allows, or a dedicated system user UUID
                recipient_id: user.id,
                subject: 'Bem-vindo ao TalkTube! 🚀',
                content: `
                    <p>Olá <strong>${user.user_metadata.full_name || 'Usuário'}</strong>,</p>
                    <p>Estamos muito felizes em ter você aqui! O TalkTube é a sua nova plataforma de reuniões com interpretação simultânea.</p>
                    <p>Algumas dicas rápidas:</p>
                    <ul>
                        <li>📅 <strong>Agenda:</strong> Veja suas próximas reuniões.</li>
                        <li>⚙️ <strong>Configurações:</strong> Personalize seu perfil.</li>
                        <li>❓ <strong>Ajuda:</strong> Acesse o menu "Ajuda" para tutoriais.</li>
                    </ul>
                    <p>Se precisar de algo, estamos por aqui.</p>
                    <p><em>Equipe TalkTube</em></p>
                `,
                is_read: false,
                created_at: new Date().toISOString()
            })
    }
}

export async function createInstantMeeting() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    const { data, error } = await supabase
        .from('meetings')
        .insert({
            host_id: user.id,
            title: 'Reunião Instantânea',
            start_time: new Date().toISOString(),
            status: 'active',
            allowed_languages: ['pt', 'en'] // Default languages
        })
        .select()
        .maybeSingle()

    if (error || !data) return { success: false, error: error?.message || 'Falha ao criar reunião' }

    redirect(`/room/${data.id}`)
}
