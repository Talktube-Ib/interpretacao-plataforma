import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id: roomId } = await params

    // Fetch meeting details
    const supabase = await createClient()
    const { data: meeting } = await supabase
        .from('meetings')
        .select('name, host_id')
        .eq('id', roomId)
        .maybeSingle()

    // Default values
    const title = meeting?.name || "Reunião TalkTube"
    const description = "Você foi convidado para participar de uma videoconferência com tradução simultânea no TalkTube."

    return {
        title: `${title} | TalkTube`,
        description: description,
        other: {
            google: 'notranslate',
        },
        openGraph: {
            title: title,

            description: description,
            url: `https://talktube.net/room/${roomId}`, // Using talktube.net domain
            siteName: 'TalkTube',
            images: [
                {
                    url: '/logos/talktube_favicon.png', // Using the favicon as authorized by user
                    width: 800,
                    height: 800,
                    alt: 'TalkTube Logo',
                },
            ],
            type: 'video.other',
        },
        twitter: {
            card: 'summary',
            title: title,
            description: description,
            images: ['/logos/talktube_favicon.png'],
        },
    }
}

export default function RoomLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
}
