"use client"

import React from 'react'
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
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {reactions.map((r) => (
                    <motion.div
                        key={r.id}
                        initial={{ y: '100vh', opacity: 0, x: `${Math.random() * 80 + 10}vw`, scale: 0.5 }}
                        animate={{
                            y: '-10vh',
                            opacity: [0, 1, 1, 0],
                            x: `${(Math.random() * 20 - 10) + (parseFloat(r.id) || 50)}vw`,
                            scale: [0.5, 1.5, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 4 + Math.random() * 2,
                            ease: "easeOut",
                            times: [0, 0.1, 0.8, 1]
                        }}
                        className="absolute text-5xl filter drop-shadow-2xl select-none"
                    >
                        {r.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
