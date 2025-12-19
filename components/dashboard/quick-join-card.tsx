'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Hash } from 'lucide-react'

export function QuickJoinCard() {
    const [roomId, setRoomId] = useState('')
    const router = useRouter()

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault()
        if (roomId.trim()) {
            router.push(`/room/${roomId.trim()}`)
        }
    }

    return (
        <Card className="bg-card border-border overflow-hidden relative group shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#06b6d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <Hash className="h-5 w-5 text-[#06b6d4]" />
                    Entrar por ID
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Tem um código de sala? Digite-o abaixo para entrar imediatamente.
                </CardDescription>
            </CardHeader>
            <CardContent className="relative">
                <form onSubmit={handleJoin} className="flex gap-2">
                    <Input
                        placeholder="ID da sala (ex: room-123)"
                        className="bg-background border-border text-foreground focus-visible:ring-[#06b6d4]"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <Button type="submit" className="bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl">
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
