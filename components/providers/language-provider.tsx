
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dictionaries, Locale } from '@/lib/i18n/dictionaries'

type Dictionary = typeof dictionaries['pt']

interface LanguageContextType {
    language: Locale
    setLanguage: (lang: Locale) => void
    t: (key: string) => string
    dictionary: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Locale>('pt')

    useEffect(() => {
        // Try to load from localStorage
        const saved = localStorage.getItem('app_language') as Locale
        if (saved && ['pt', 'en', 'es'].includes(saved)) {
            const timer = setTimeout(() => setLanguageState(saved), 0)
            return () => clearTimeout(timer)
        }
    }, [])

    const setLanguage = (lang: Locale) => {
        setLanguageState(lang)
        localStorage.setItem('app_language', lang)
    }

    // Helper to get nested translation safely
    // Key format: 'category.key' e.g. 'sidebar.dashboard'
    const t = (key: string): string => {
        const keys = key.split('.')
        let current: Record<string, unknown> | string = dictionaries[language] as Record<string, unknown>

        for (const k of keys) {
            const val = (current as Record<string, unknown>)[k]
            if (typeof current === 'string' || val === undefined) {
                console.warn(`Missing translation for key: ${key} in language: ${language}`)
                return key // Fallback to key name
            }
            current = val as Record<string, unknown> | string
        }

        return typeof current === 'string' ? current : key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dictionary: dictionaries[language] as Dictionary }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
