import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bug } from "lucide-react"

interface DebugLogsProps {
    logs: string[]
}

export function DebugLogs({ logs }: DebugLogsProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-muted-foreground hover:text-foreground">
                    <Bug className="h-4 w-4" />
                    <span className="text-xs">Logs</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[80vh]">
                <DialogHeader>
                    <DialogTitle>WebRTC Debug Logs</DialogTitle>
                </DialogHeader>
                <div className="h-full w-full rounded-md border p-4 bg-black/90 font-mono text-xs text-green-500 overflow-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 border-b border-white/5 pb-0.5">
                            {log}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
