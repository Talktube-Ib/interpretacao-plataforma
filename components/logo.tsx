import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("relative flex items-center justify-center p-2", className)}>
            {/* "TALK" Block - Dark Blue */}
            <div className="relative z-10 bg-[#1e293b] text-white font-black italic tracking-tighter px-2 py-1 transform -skew-x-12 shadow-[4px_4px_0px_#0f172a] text-xl">
                TALK
                {/* Decorative triangle for speech bubble tail effect if needed, simpler to keep blocky */}
            </div>

            {/* "tube" Box - Cyan/Teal */}
            <div className="relative z-20 -ml-2 mb-4 bg-white text-black font-black italic tracking-tighter px-2 py-1 transform -skew-x-12 shadow-[4px_4px_0px_#22d3ee] border-2 border-[#22d3ee] text-xl rotate-[-5deg]">
                tube
            </div>
        </div>
    )
}
