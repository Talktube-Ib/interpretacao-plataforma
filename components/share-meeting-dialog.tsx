'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Share2, Check } from 'lucide-react'
import { useState } from 'react'

interface ShareMeetingDialogProps {
    roomId: string
    trigger?: React.ReactNode
    className?: string
}

export function ShareMeetingDialog({ roomId, trigger, className }: ShareMeetingDialogProps) {
    const [copied, setCopied] = useState(false)
    const [open, setOpen] = useState(false)

    // Construct URL (assuming window is available, otherwise generic)
    const url = typeof window !== 'undefined'
        ? `${window.location.origin}/room/${roomId}`
        : `https://talktube.net/room/${roomId}`

    const handleCopy = () => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className={className}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartilhar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#0f172a] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-[#06b6d4]" />
                        Convidar Pessoas
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <p className="text-sm text-gray-400">
                        Compartilhe este link para que outros possam entrar na reunião <strong>{roomId}</strong>.
                    </p>
                    <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                            <Input
                                id="link"
                                defaultValue={url}
                                readOnly
                                className="bg-white/5 border-white/10 text-gray-300 h-9"
                            />
                        </div>
                        <Button onClick={handleCopy} size="sm" className="px-3 bg-[#06b6d4] hover:bg-[#0891b2]">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
