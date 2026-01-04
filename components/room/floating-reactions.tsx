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
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[50]">
            <AnimatePresence>
                {reactions.map((reaction) => (
                    <motion.div
                        key={reaction.id}
                        initial={{ opacity: 1, y: '100%', x: Math.random() * 100 - 50 + '%' }}
                        animate={{ opacity: 0, y: '20%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="absolute bottom-20 left-1/2 text-4xl"
                        style={{ marginLeft: `${Math.random() * 200 - 100}px` }}
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
