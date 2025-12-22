"use client"

import { MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function FloatingWhatsApp() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.a
                    href="https://wa.me/5511999999999" // Replace with actual number
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileHover={{ scale: 1.1 }}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-full shadow-[0_4px_12px_rgba(37,211,102,0.4)] font-medium transition-colors"
                >
                    <MessageCircle className="w-6 h-6 fill-current" />
                    <span className="hidden sm:inline">Falar com Especialista</span>
                </motion.a>
            )}
        </AnimatePresence>
    )
}
