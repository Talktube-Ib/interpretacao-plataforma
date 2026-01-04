'use client'

export function ParticipantList(props: any) {
    return (
        <div className="bg-card w-full h-full p-4 border-l border-border flex flex-col">
            <h2 className="font-bold flex-none mb-4">Participants (Placeholder)</h2>
            <div className="flex-1 bg-muted/20 rounded p-2">
                <p className="text-muted-foreground text-sm">Participant list is under maintenance.</p>
            </div>
            <button onClick={props.onClose} className="mt-4 p-2 bg-secondary text-secondary-foreground rounded">Close</button>
        </div>
    )
}
