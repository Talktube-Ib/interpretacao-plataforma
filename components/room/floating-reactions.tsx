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
    // Função simples para gerar um número determinístico a partir da string de ID
    const getSeed = (id: string) => {
        let hash = 0
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash)
        }
        return Math.abs(hash)
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {reactions.map((r) => {
                    const seed = getSeed(r.id)
                    const startX = (seed % 70) + 15 // Entre 15 e 85vw

                    return (
                        <motion.div
                            key={r.id}
                            initial={{ y: '100%', opacity: 0, x: `${startX}vw`, scale: 0.5 }}
                            animate={{
                                y: '-20vh',
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, 1.5, 1.2, 0.8],
                                rotate: [0, 20, -20, 0],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 4 + (seed % 2),
                                ease: "easeOut",
                                times: [0, 0.1, 0.8, 1]
                            }}
                            className="absolute text-7xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] select-none z-[100]"
                        >
                            {r.emoji}
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
