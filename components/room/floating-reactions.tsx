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
                {reactions.map((reaction, index) => (
                    <motion.div
                        key={reaction.id}
                        initial={{ opacity: 0, y: 50, scale: 0.5, x: -20 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: -200 - (Math.random() * 100),
                            scale: 1,
                            x: 0 + (Math.random() * 20)
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 4,
                            ease: "easeOut",
                            times: [0, 0.1, 0.8, 1]
                        }}
                        className="absolute bottom-0 left-0 text-5xl drop-shadow-lg"
                        style={{
                            marginLeft: `${Math.random() * 10}px`,
                            zIndex: 100 + index
                        }}
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
