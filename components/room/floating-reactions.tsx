'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Reaction {
    id: string
    emoji: string
    userId: string
}

interface FloatingReactionsProps {
    reactions: Reaction[]
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
    return (
        <div className="absolute bottom-24 left-6 w-24 h-[60vh] pointer-events-none z-[50] flex flex-col justify-end">
            <AnimatePresence>
                {reactions.map((reaction, index) => {
                    // Use a seed from the ID to keep it deterministic for React Compiler/Linter
                    const seed = parseInt(reaction.id.slice(-2), 16) || index;
                    const xOffset = (seed % 40) - 20;
                    const yOffset = -400 - (seed % 100);
                    const margin = (seed % 10);

                    return (
                        <motion.div
                            key={reaction.id}
                            initial={{ opacity: 0, y: 50, scale: 0.5, x: xOffset }}
                            animate={{
                                opacity: [0, 1, 1, 1, 0],
                                y: yOffset,
                                scale: 1,
                                x: [xOffset, xOffset + 15, xOffset - 15, xOffset + 10, xOffset]
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 8,
                                ease: "easeOut",
                                times: [0, 0.2, 0.5, 0.8, 1]
                            }}
                            className="absolute bottom-0 left-0 text-5xl drop-shadow-lg"
                            style={{
                                marginLeft: `${margin}px`,
                                zIndex: 100 + index
                            }}
                        >
                            {reaction.emoji}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    )
}
