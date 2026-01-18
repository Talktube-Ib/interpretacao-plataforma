'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEN_AI_KEY = process.env.GOOGLE_API_KEY || ''

export async function generateMeetingMinutes(meetingId: string) {
    if (!GEN_AI_KEY) {
        return {
            success: false,
            error: "Chave de API do Google Gemini não configurada (GOOGLE_API_KEY)."
        }
    }

    try {
        const supabase = await createClient()

        // 1. Fetch Transcripts
        const { data: transcripts, error } = await supabase
            .from('meeting_transcripts')
            .select('*')
            .eq('meeting_id', meetingId)
            .order('created_at', { ascending: true })

        if (error) throw new Error(`Erro ao buscar transcrições: ${error.message}`)
        if (!transcripts || transcripts.length === 0) {
            return { success: false, error: "Nenhuma transcrição encontrada para gerar a ata." }
        }

        // 2. Format Context
        const conversationText = transcripts.map(t => `[${t.user_name}]: ${t.content}`).join('\n')

        // 3. Call Gemini
        const genAI = new GoogleGenerativeAI(GEN_AI_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
Role: Você é um Secretário Executivo experiente e profissional.
Task: Crie uma Ata de Reunião formal baseada na transcrição abaixo.

Transcrição da Reunião:
---
${conversationText}
---

Formato de Saída (Markdown):
# Ata de Reunião
**Data:** ${new Date().toLocaleDateString('pt-BR')}

## 1. Resumo Executivo
(Um parágrafo conciso sobre o objetivo e tom da reunião)

## 2. Principais Tópicos Discutidos
- (Lista detalhada)

## 3. Decisões Tomadas
- (Lista de consensos ou votações)

## 4. Ações e Responsáveis (Action Items)
- [ ] O que? (Quem?) - Prazo (se houver)

## 5. Próximos Passos

Nota: Use tom formal, impessoal e objetivo. Se a transcrição for insuficiente ou parecer teste, faça um resumo criativo mas indique que foi uma simulação.
`

        const result = await model.generateContent(prompt)
        const summary = result.response.text()

        // 4. Save Summary
        const { error: saveError } = await supabase
            .from('meeting_summaries')
            .insert({
                meeting_id: meetingId,
                summary_md: summary
            })

        if (saveError) throw new Error("Erro ao salvar o resumo no banco.")

        return { success: true, summary }

    } catch (err: any) {
        console.error("Erro na geração da ata:", err)
        return { success: false, error: err.message || "Erro desconhecido ao gerar ata." }
    }
}
