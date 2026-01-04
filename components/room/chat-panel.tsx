'use client'

export function ChatPanel(props: any) {
    return (
        <div className="bg-card w-full h-full p-4 border-l border-border flex flex-col">
            <h2 className="font-bold flex-none mb-4">Chat (Placeholder)</h2>
            <div className="flex-1 bg-muted/20 rounded p-2">
                <p className="text-muted-foreground text-sm">Chat is currently being renovated.</p>
            </div>
            <button onClick={props.onClose} className="mt-4 p-2 bg-secondary text-secondary-foreground rounded">Close</button>
        </div>
    )
}
