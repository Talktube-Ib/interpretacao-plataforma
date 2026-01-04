'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, X, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    sender: string
    senderName?: string
    text: string
    timestamp: number
    role: string
    recipientId?: string
}

interface ChatPanelProps {
    messages: Message[]
    userId: string
    peers: any[] // We really only need this for mentions/private in future
    onSendMessage: (text: string) => void
    onClose: () => void
}

export function ChatPanel({ messages, userId, peers, onSendMessage, onClose }: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = () => {
        if (!inputValue.trim()) return
        onSendMessage(inputValue)
        setInputValue('')
        // Keep focus?
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Sort messages by time
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)

    return (
        <div className="flex flex-col h-full bg-slate-950 border-l border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
                <h2 className="font-bold text-white text-lg tracking-tight">Chat da Sala</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {sortedMessages.length === 0 && (
                        <div className="text-center text-slate-500 mt-10 text-sm">
                            Nenhuma mensagem ainda.<br />Seja o primeiro a falar! 👋
                        </div>
                    )}

                    {sortedMessages.map((msg, index) => {
                        const isMe = msg.sender === userId
                        const isSystem = msg.id === 'system' // If we have system messages
                        const showHeader = index === 0 || sortedMessages[index - 1].sender !== msg.sender || (msg.timestamp - sortedMessages[index - 1].timestamp > 60000)

                        return (
                            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                {showHeader && (
                                    <div className="flex items-end gap-2 mb-1 mt-2">
                                        {!isMe && (
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-bold border border-white/10">
                                                {msg.senderName?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                                            </div>
                                        )}
                                        <span className={cn("text-xs font-bold", isMe ? "text-slate-400" : "text-slate-300")}>
                                            {isMe ? 'Você' : msg.senderName || 'Anônimo'}
                                        </span>
                                        <span className="text-[10px] text-slate-600">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                <div className={cn(
                                    "px-4 py-2 rounded-2xl max-w-[85%] text-sm break-words shadow-sm",
                                    isMe
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
                                )}>
                                    {msg.text}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/10">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite uma mensagem..."
                        className="bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-xl"
                        autoComplete="off"
                    />
                    <Button
                        onClick={handleSend}
                        size="icon"
                        disabled={!inputValue.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
