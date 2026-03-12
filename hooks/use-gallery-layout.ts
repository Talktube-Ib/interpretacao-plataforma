import { useState, useEffect, useCallback, RefObject } from 'react'

interface LayoutParams {
    width: number
    height: number
    cols: number
    rows: number
    count: number
}

export function useGalleryLayout(containerRef: RefObject<HTMLElement | null>, participantCount: number) {
    const [layout, setLayout] = useState<LayoutParams>({ width: 320, height: 180, cols: 1, rows: 1, count: 0 })

    const calculateLayout = useCallback(() => {
        if (!containerRef.current || participantCount === 0) return

        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current
        const ratio = 16 / 9

        let bestWidth = 0
        let bestHeight = 0
        let bestCols = 1
        let bestRows = 1

        // Brute force search for best grid configuration
        for (let cols = 1; cols <= participantCount; cols++) {
            const rows = Math.ceil(participantCount / cols)

            // Calculate max possible width/height for this configuration
            let w = containerWidth / cols
            let h = w / ratio

            // If height exceeds space, scale down based on rows
            if (h * rows > containerHeight) {
                h = containerHeight / rows
                w = h * ratio
            }

            // Area optimization
            if (w * h > bestWidth * bestHeight) {
                bestWidth = w
                bestHeight = h
                bestCols = cols
                bestRows = rows
            }
        }

        // Apply scaling constraints (V11.3: Adjusted for tablets)
        const isSmallScreen = containerWidth < 768
        const padding = isSmallScreen ? 4 : 12

        setLayout({
            width: Math.floor(bestWidth - padding),
            height: Math.floor(bestHeight - padding),
            cols: bestCols,
            rows: bestRows,
            count: participantCount
        })
    }, [participantCount, containerRef])

    useEffect(() => {
        const timer = setTimeout(() => calculateLayout(), 0)
        const resizeObserver = new ResizeObserver(() => calculateLayout())
        if (containerRef.current) resizeObserver.observe(containerRef.current)
        return () => {
            clearTimeout(timer)
            resizeObserver.disconnect()
        }
    }, [calculateLayout, containerRef])

    return layout
}
