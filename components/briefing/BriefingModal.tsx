'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookOpen, Upload, FileText, Trash2, X } from 'lucide-react'
import { useBriefing, BriefingDocument } from '@/hooks/useBriefing'
import { DocumentViewer } from './DocumentViewer'
import { cn } from '@/lib/utils'

interface BriefingModalProps {
    roomId: string
    isHost: boolean
}

export function BriefingModal({ roomId, isHost }: BriefingModalProps) {
    const { documents, loading, uploading, uploadDocument, deleteDocument } = useBriefing(roomId)
    const [selectedDoc, setSelectedDoc] = useState<BriefingDocument | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white" title="Materiais de Briefing">
                    <BookOpen className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] bg-[#020817] border-white/10 flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-[#06b6d4]" />
                        <h2 className="text-sm font-bold tracking-wider font-mono text-white">SALA DE PREPARAÇÃO</h2>
                    </div>

                    {isHost && (
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="briefing-upload"
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) uploadDocument(e.target.files[0])
                                }}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-dashed border-zinc-600 hover:border-white"
                                onClick={() => document.getElementById('briefing-upload')?.click()}
                                disabled={uploading}
                            >
                                <Upload className="h-3 w-3 mr-2" />
                                {uploading ? "Enviando..." : "Adicionar Material"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: File List */}
                    <div className="w-64 bg-black/20 border-r border-white/10 flex flex-col">
                        <div className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Arquivos Disponíveis
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {documents.length === 0 && (
                                <div className="text-center py-10 text-zinc-600 text-xs">
                                    Nenhum arquivo.
                                </div>
                            )}
                            {documents.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group",
                                        selectedDoc?.id === doc.id ? "bg-[#06b6d4]/10 border border-[#06b6d4]/30" : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className={cn("h-4 w-4 shrink-0", selectedDoc?.id === doc.id ? "text-[#06b6d4]" : "text-zinc-500")} />
                                        <span className={cn("text-xs truncate font-medium", selectedDoc?.id === doc.id ? "text-white" : "text-zinc-400")}>{doc.name}</span>
                                    </div>

                                    {isHost && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-400"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm("Excluir arquivo?")) deleteDocument(doc.id)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Area: Viewer */}
                    <div className="flex-1 bg-zinc-950/50 p-4 flex flex-col">
                        {selectedDoc ? (
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                <div className="mb-2 flex justify-between items-center px-1">
                                    <span className="text-sm font-bold text-zinc-300">{selectedDoc.name}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                                    <DocumentViewer url={selectedDoc.url} type={selectedDoc.type} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                                <BookOpen className="h-16 w-16 opacity-20" />
                                <p className="text-sm">Selecione um documento para visualizar e anotar.</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
