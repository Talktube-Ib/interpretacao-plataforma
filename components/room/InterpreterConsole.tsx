'use client'

export function InterpreterConsole(props: any) {
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white p-4 rounded-xl border border-white/20">
            <div className="font-bold mb-2 text-center">Interpreter Console</div>
            <div className="flex gap-2 justify-center">
                <button className="px-3 py-1 bg-blue-600 rounded">Floor</button>
                <button className="px-3 py-1 bg-gray-600 rounded">Mute</button>
            </div>
        </div>
    )
}
