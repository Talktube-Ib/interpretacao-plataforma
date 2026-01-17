'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Pen, MousePointer2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
    url: string
    type: string
}

export function DocumentViewer({ url, type }: DocumentViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [mode, setMode] = useState<'view' | 'draw' | 'erase'>('view')
    const [color, setColor] = useState('#ef4444') // Red default
    const isDrawing = useRef(false)
    const contextRef = useRef<CanvasRenderingContext2D | null>(null)

    // Init Canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Timeout to wait for layout?
        setTimeout(() => {
            canvas.width = container.clientWidth
            canvas.height = container.clientHeight

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.lineCap = 'round'
                ctx.strokeStyle = color
                ctx.lineWidth = 3
                contextRef.current = ctx
            }
        }, 500) // crude wait for image load layout

        // Handle Resize
        const handleResize = () => {
            // Resizing clears canvas usually. 
            // Ideally we save the paths and redraw. 
            // For PoC, let's just accept it clears or blocks resize.
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)

    }, [url])

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color
            contextRef.current.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'
            contextRef.current.lineWidth = mode === 'erase' ? 20 : 3
        }
    }, [color, mode])

    const startDrawing = ({ nativeEvent }: any) => {
        if (mode === 'view') return
        const { offsetX, offsetY } = nativeEvent
        contextRef.current?.beginPath()
        contextRef.current?.moveTo(offsetX, offsetY)
        isDrawing.current = true
    }

    const finishDrawing = () => {
        contextRef.current?.closePath()
        isDrawing.current = false
    }

    const draw = ({ nativeEvent }: any) => {
        if (!isDrawing.current || mode === 'view') return
        const { offsetX, offsetY } = nativeEvent
        contextRef.current?.lineTo(offsetX, offsetY)
        contextRef.current?.stroke()
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-black/40 border-b border-white/10">
                <div className="flex items-center gap-1">
                    <Button
                        variant={mode === 'view' ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMode('view')}
                    >
                        <MousePointer2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={mode === 'draw' ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMode('draw')}
                    >
                        <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={mode === 'erase' ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMode('erase')}
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>
                </div>

                {mode === 'draw' && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setColor('#ef4444')} className={cn("w-6 h-6 rounded-full bg-red-500 ring-2 ring-offset-2 ring-offset-black", color === '#ef4444' ? "ring-white" : "ring-transparent")} />
                        <button onClick={() => setColor('#3b82f6')} className={cn("w-6 h-6 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-offset-black", color === '#3b82f6' ? "ring-white" : "ring-transparent")} />
                        <button onClick={() => setColor('#22c55e')} className={cn("w-6 h-6 rounded-full bg-green-500 ring-2 ring-offset-2 ring-offset-black", color === '#22c55e' ? "ring-white" : "ring-transparent")} />
                    </div>
                )}
            </div>

            {/* Viewer Area */}
            <div ref={containerRef} className="flex-1 relative overflow-auto bg-zinc-950 flex items-center justify-center p-4">
                {/* Content Layer */}
                <div className="relative shadow-2xl">
                    {type.includes('image') ? (
                        <img src={url} alt="Document" className="max-w-full max-h-[70vh] object-contain pointer-events-none select-none" />
                    ) : (
                        <iframe src={url} className="w-[800px] h-[70vh] bg-white" />
                        // Note: Canvas over iframe captures events poorly due to iframe stealing focus. 
                        // For PDF, standard approach is using PDF.js and rendering to Canvas, then overlaying another Canvas.
                        // For MVP, iframes block drawing. We will disable drawing mode for PDFs or put a transparent div over it (which blocks scrolling).
                    )}

                    {/* Drawing Layer */}
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseMove={draw}
                        onMouseLeave={finishDrawing}
                        className={cn(
                            "absolute inset-0 w-full h-full cursor-crosshair",
                            mode === 'view' && "pointer-events-none"
                        )}
                    />
                </div>
            </div>

            <div className="bg-black/40 p-1 text-[10px] text-center text-zinc-500">
                {type.includes('pdf') && "Nota: Anotações em PDF podem não funcionar corretamente sobre o iframe."}
            </div>
        </div>
    )
}
