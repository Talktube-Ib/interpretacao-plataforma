'use client'

export function InterpreterSetupModal(props: any) {
    if (!props.isOpen) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card p-6 rounded-lg text-card-foreground w-full max-w-sm">
                <h2 className="text-lg font-bold mb-4">Interpreter Setup</h2>
                <div className="grid gap-2">
                    {props.availableLanguages?.map((lang: any) => (
                        <button
                            key={lang.code}
                            onClick={() => props.onSelect(lang.code)}
                            className="p-2 bg-secondary rounded hover:bg-secondary/80"
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
